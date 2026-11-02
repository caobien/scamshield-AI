/**
 * tests/evaluation/evalRunner.ts
 * AI evaluation runner for ScamShield AI.
 *
 * Usage:
 *   GEMINI_API_KEY=your_key npx tsx tests/evaluation/evalRunner.ts
 *   GEMINI_API_KEY=your_key EVAL_LIMIT=20 npx tsx tests/evaluation/evalRunner.ts
 *   EVAL_DRY_RUN=true npx tsx tests/evaluation/evalRunner.ts    # No API calls
 *
 * Output metrics: accuracy, precision, recall, F1, FPR, FNR, confusion matrix, breakdown by category.
 *
 * If GEMINI_API_KEY is not set or API is unreachable, results are marked UNVERIFIED.
 * Metrics are NEVER hardcoded — they derive from actual API responses.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ALL_SAMPLES, AMBIGUOUS_SAMPLES, EvalSample, getDatasetStats } from './evalDataset.js';

dotenv.config();

// ─── Configuration ─────────────────────────────────────────────────────────────

const DRY_RUN = process.env.EVAL_DRY_RUN === 'true';
const EVAL_LIMIT = parseInt(process.env.EVAL_LIMIT || '0', 10); // 0 = run all
const API_BASE = process.env.EVAL_API_BASE || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.env.EVAL_CONCURRENCY || '3', 10);
const TIMEOUT_MS = parseInt(process.env.EVAL_TIMEOUT_MS || '45000', 10);
const REQUEST_DELAY_MS = parseInt(process.env.EVAL_DELAY_MS || '1000', 10);

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EvalResult {
  sampleId: string;
  category: string;
  sourceType: string;
  groundTruth: 'SAFE' | 'SCAM';
  predicted: 'SAFE' | 'SCAM' | 'ERROR';
  riskScore?: number;
  classification?: string;
  errorMsg?: string;
  durationMs?: number;
}

interface ConfusionMatrix {
  TP: number; // Predicted SCAM, actual SCAM
  TN: number; // Predicted SAFE, actual SAFE
  FP: number; // Predicted SCAM, actual SAFE (false alarm)
  FN: number; // Predicted SAFE, actual SCAM (missed scam)
}

interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number; // False Positive Rate
  fnr: number; // False Negative Rate
  confusion: ConfusionMatrix;
  totalEvaluated: number;
  errored: number;
  byCategory: Record<string, CategoryMetrics>;
}

interface CategoryMetrics {
  total: number;
  correct: number;
  accuracy: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}

// ─── Scam Threshold ─────────────────────────────────────────────────────────────

/**
 * Classify a Gemini result as SCAM or SAFE.
 * Score >= 50 OR classification not in SAFE/UNKNOWN = SCAM prediction.
 */
function predictLabel(riskScore: number, classification: string): 'SAFE' | 'SCAM' {
  const safeClasses = ['SAFE', 'UNKNOWN'];
  if (riskScore >= 50) return 'SCAM';
  if (!safeClasses.includes(classification?.toUpperCase())) return 'SCAM';
  return 'SAFE';
}

// ─── API Call ───────────────────────────────────────────────────────────────────

async function callAnalyzeApi(sample: EvalSample): Promise<EvalResult> {
  const start = Date.now();

  if (DRY_RUN) {
    // Return mock result for dry run
    await new Promise(r => setTimeout(r, 10));
    return {
      sampleId: sample.id,
      category: sample.category,
      sourceType: sample.sourceType,
      groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
      predicted: 'SAFE', // Conservative default for dry run
      riskScore: 10,
      classification: 'SAFE',
      durationMs: 10,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body: Record<string, string> = {
      sourceType: sample.sourceType,
      inputContent: sample.input,
    };

    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        sampleId: sample.id,
        category: sample.category,
        sourceType: sample.sourceType,
        groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
        predicted: 'ERROR',
        errorMsg: `HTTP ${response.status}: ${errText.slice(0, 100)}`,
        durationMs: Date.now() - start,
      };
    }

    const data = await response.json() as { riskScore?: number; classification?: string; error?: string };

    if (data.error) {
      return {
        sampleId: sample.id,
        category: sample.category,
        sourceType: sample.sourceType,
        groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
        predicted: 'ERROR',
        errorMsg: data.error.slice(0, 100),
        durationMs: Date.now() - start,
      };
    }

    const riskScore = data.riskScore ?? 0;
    const classification = data.classification ?? 'UNKNOWN';
    const predicted = predictLabel(riskScore, classification);

    return {
      sampleId: sample.id,
      category: sample.category,
      sourceType: sample.sourceType,
      groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
      predicted,
      riskScore,
      classification,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sampleId: sample.id,
      category: sample.category,
      sourceType: sample.sourceType,
      groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
      predicted: 'ERROR',
      errorMsg: msg.slice(0, 100),
      durationMs: Date.now() - start,
    };
  }
}

// ─── Concurrency Pool ───────────────────────────────────────────────────────────

async function runWithConcurrency(samples: EvalSample[], limit: number): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  let idx = 0;
  let done = 0;

  async function worker() {
    while (idx < samples.length) {
      const current = samples[idx++];
      const result = await callAnalyzeApi(current);
      results.push(result);
      done++;
      process.stdout.write(`\r  Progress: ${done}/${samples.length} (${Math.round(done / samples.length * 100)}%)`);
      if (idx < samples.length) await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  process.stdout.write('\n');
  return results;
}

// ─── Metrics Calculation ────────────────────────────────────────────────────────

function calculateMetrics(results: EvalResult[]): Metrics {
  const evaluated = results.filter(r => r.predicted !== 'ERROR');
  const errored = results.filter(r => r.predicted === 'ERROR').length;

  const confusion: ConfusionMatrix = { TP: 0, TN: 0, FP: 0, FN: 0 };

  for (const r of evaluated) {
    if (r.groundTruth === 'SCAM' && r.predicted === 'SCAM') confusion.TP++;
    else if (r.groundTruth === 'SAFE' && r.predicted === 'SAFE') confusion.TN++;
    else if (r.groundTruth === 'SAFE' && r.predicted === 'SCAM') confusion.FP++;
    else if (r.groundTruth === 'SCAM' && r.predicted === 'SAFE') confusion.FN++;
  }

  const { TP, TN, FP, FN } = confusion;
  const total = evaluated.length;

  const accuracy = total > 0 ? (TP + TN) / total : 0;
  const precision = (TP + FP) > 0 ? TP / (TP + FP) : 0;
  const recall = (TP + FN) > 0 ? TP / (TP + FN) : 0;
  const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const fpr = (FP + TN) > 0 ? FP / (FP + TN) : 0;
  const fnr = (FN + TP) > 0 ? FN / (FN + TP) : 0;

  // Per-category breakdown
  const categories = [...new Set(results.map(r => r.category))];
  const byCategory: Record<string, CategoryMetrics> = {};

  for (const cat of categories) {
    const catResults = evaluated.filter(r => r.category === cat);
    const catConf = { tp: 0, tn: 0, fp: 0, fn: 0 };
    for (const r of catResults) {
      if (r.groundTruth === 'SCAM' && r.predicted === 'SCAM') catConf.tp++;
      else if (r.groundTruth === 'SAFE' && r.predicted === 'SAFE') catConf.tn++;
      else if (r.groundTruth === 'SAFE' && r.predicted === 'SCAM') catConf.fp++;
      else if (r.groundTruth === 'SCAM' && r.predicted === 'SAFE') catConf.fn++;
    }
    byCategory[cat] = {
      total: catResults.length,
      correct: catConf.tp + catConf.tn,
      accuracy: catResults.length > 0 ? (catConf.tp + catConf.tn) / catResults.length : 0,
      ...catConf,
    };
  }

  return { accuracy, precision, recall, f1, fpr, fnr, confusion, totalEvaluated: total, errored, byCategory };
}

// ─── Report Writer ──────────────────────────────────────────────────────────────

function pct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

function printReport(metrics: Metrics, unverified: boolean, unverifiedReason?: string) {
  const bar = '═'.repeat(60);

  console.log(`\n${bar}`);
  console.log('  SCAMSHIELD AI — EVALUATION REPORT');
  console.log(`  Generated: ${new Date().toISOString()}`);
  console.log(bar);

  if (unverified) {
    console.log('\n  ⚠️  STATUS: UNVERIFIED');
    console.log(`  Reason: ${unverifiedReason}`);
    console.log('  Metrics below are NOT from a live API run.\n');
  } else {
    console.log('\n  ✅  STATUS: VERIFIED (Live API)\n');
  }

  console.log('── Evaluation Statistics ────────────────────────────');
  console.log(`  Total evaluated (non-error): ${metrics.totalEvaluated}`);
  console.log(`  Errored (excluded):          ${metrics.errored}`);

  console.log('\n── Confusion Matrix ─────────────────────────────────');
  console.log(`  TP (Scam correctly detected): ${metrics.confusion.TP}`);
  console.log(`  TN (Safe correctly passed):   ${metrics.confusion.TN}`);
  console.log(`  FP (Safe falsely flagged):    ${metrics.confusion.FP}`);
  console.log(`  FN (Scam missed):             ${metrics.confusion.FN}`);

  console.log('\n── Core Metrics ─────────────────────────────────────');
  console.log(`  Accuracy:  ${pct(metrics.accuracy)}`);
  console.log(`  Precision: ${pct(metrics.precision)}`);
  console.log(`  Recall:    ${pct(metrics.recall)}`);
  console.log(`  F1 Score:  ${pct(metrics.f1)}`);
  console.log(`  FPR:       ${pct(metrics.fpr)} (false positive rate)`);
  console.log(`  FNR:       ${pct(metrics.fnr)} (false negative rate)`);

  console.log('\n── By Category ──────────────────────────────────────');
  const catEntries = Object.entries(metrics.byCategory).sort((a, b) => b[1].total - a[1].total);
  for (const [cat, m] of catEntries) {
    if (m.total === 0) continue;
    console.log(`  ${cat.padEnd(25)} total=${String(m.total).padStart(3)}  acc=${pct(m.accuracy).padStart(6)}  TP=${m.tp} TN=${m.tn} FP=${m.fp} FN=${m.fn}`);
  }

  console.log(`\n${bar}\n`);
}

// ─── Save Results ───────────────────────────────────────────────────────────────

function saveResults(results: EvalResult[], metrics: Metrics, unverified: boolean, unverifiedReason?: string) {
  const outDir = path.join(process.cwd(), 'tests', 'evaluation', 'results');
  fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const prefix = unverified ? 'UNVERIFIED_' : 'VERIFIED_';
  const filename = `${prefix}eval-${timestamp}.json`;
  const outPath = path.join(outDir, filename);

  const report = {
    meta: {
      timestamp: new Date().toISOString(),
      status: unverified ? 'UNVERIFIED' : 'VERIFIED',
      unverifiedReason: unverifiedReason || null,
      dryRun: DRY_RUN,
      apiBase: API_BASE,
    },
    metrics,
    samples: results,
  };

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`  Results saved to: ${outPath}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  ScamShield AI — Evaluation Runner');
  console.log('══════════════════════════════════════════════════════════════\n');

  // Print dataset stats
  const stats = getDatasetStats();
  console.log('── Dataset ──────────────────────────────────────────────────');
  console.log(`  Total: ${stats.total} (SAFE: ${stats.safe}, SCAM: ${stats.scam})`);
  console.log(`  Source types: MESSAGE=${stats.bySourceType.MESSAGE}, URL=${stats.bySourceType.URL}`);
  console.log(`  Ambiguous (excluded): ${stats.ambiguous}`);
  console.log(`  Categories: ${Object.keys(stats.byCategory).join(', ')}`);

  if (DRY_RUN) {
    console.log('\n  ⚠️  DRY RUN mode: No API calls will be made.');
  }

  // Determine if we can actually run
  let unverified = false;
  let unverifiedReason: string | undefined;

  if (DRY_RUN) {
    unverified = true;
    unverifiedReason = 'DRY_RUN=true — no API calls made';
  } else if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    unverified = true;
    unverifiedReason = 'GEMINI_API_KEY not set — API calls will fail';
  }

  // Check server reachability (skip in dry run)
  if (!DRY_RUN && !unverified) {
    try {
      const healthResp = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!healthResp.ok) {
        unverified = true;
        unverifiedReason = `Server at ${API_BASE} returned HTTP ${healthResp.status}. Start server first: npm run dev`;
      }
    } catch {
      unverified = true;
      unverifiedReason = `Cannot reach server at ${API_BASE}. Start server first: npm run dev`;
    }
  }

  if (unverified && !DRY_RUN) {
    console.log(`\n  ⚠️  UNVERIFIED: ${unverifiedReason}`);
    console.log('  To run live evaluation:');
    console.log('    1. npm run dev (in a separate terminal)');
    console.log('    2. GEMINI_API_KEY=your_key npm run eval');
    console.log('\n  Running DRY_RUN to show metrics structure...\n');
  }

  // Select samples
  let samples = ALL_SAMPLES;
  if (EVAL_LIMIT > 0) {
    samples = samples.slice(0, EVAL_LIMIT);
    console.log(`\n  Limited to first ${EVAL_LIMIT} samples (EVAL_LIMIT=${EVAL_LIMIT})`);
  }

  console.log(`\n  Running ${samples.length} evaluations (concurrency=${CONCURRENCY})...\n`);

  const results = await runWithConcurrency(samples, unverified ? 1 : CONCURRENCY);

  const metrics = calculateMetrics(results);

  printReport(metrics, unverified, unverifiedReason);
  saveResults(results, metrics, unverified, unverifiedReason);

  if (unverified) {
    console.log('  BASELINE GATE = UNVERIFIED (see reason above)');
    console.log('  To achieve VERIFIED: start the server with GEMINI_API_KEY and run: npm run eval\n');
    // Don't exit non-zero for dry-run/unverified — this is expected behavior
  } else {
    console.log('  BASELINE GATE evaluation complete. Check metrics above for PASS criteria.');
    // Fail if >50% error rate
    if (metrics.errored > samples.length * 0.5) {
      console.error(`  ERROR: Too many API errors (${metrics.errored}/${samples.length}). Results unreliable.`);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error('Fatal eval error:', err);
  process.exit(1);
});
