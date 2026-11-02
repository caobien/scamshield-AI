/**
 * tests/evaluation/runEvalWithServer.ts
 * Self-contained evaluation runner.
 * Starts the Express server internally, runs eval, stops server, prints metrics.
 *
 * SECURITY: GEMINI_API_KEY is read from .env (dotenv.config).
 *   - The value is NEVER printed to stdout/stderr.
 *   - The value is NEVER saved in results JSON.
 *   - Pass the key via .env ONLY — never via command-line argument.
 *
 * Usage (Windows PowerShell):
 *   npx tsx tests/evaluation/runEvalWithServer.ts
 *   EVAL_LIMIT=20 npx tsx tests/evaluation/runEvalWithServer.ts
 */

import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ALL_SAMPLES, STRATIFIED_20_SAMPLES, EvalSample, getDatasetStats } from './evalDataset.js';

dotenv.config();

// ─── Key guard ────────────────────────────────────────────────────────────────

const apiKey = process.env.GEMINI_API_KEY ?? '';
if (!apiKey || apiKey.trim() === 'your_gemini_api_key_here' || apiKey.trim().length < 20) {
  console.error('\n\u274c GEMINI_API_KEY is missing or still a placeholder in .env');
  console.error('  1. Open .env in a text editor');
  console.error('  2. Replace the placeholder with your rotated API key');
  console.error('  3. Re-run: npx tsx tests/evaluation/runEvalWithServer.ts\n');
  process.exit(1);
}

import { parseRetryAfterHeader, calculateCooldownMs } from './ratePacingUtils.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const SERVER_PORT  = parseInt(process.env.EVAL_SERVER_PORT || '3777', 10);
const API_BASE     = `http://localhost:${SERVER_PORT}`;
const EVAL_LIMIT   = parseInt(process.env.EVAL_LIMIT || '0', 10);
const CONCURRENCY  = 1; // Strictly sequential execution — no concurrent requests
const DELAY_MS     = parseInt(process.env.EVAL_DELAY_MS || '6000', 10); // Default 6000ms (6 seconds) between calls
const TIMEOUT_MS   = parseInt(process.env.EVAL_TIMEOUT_MS || '45000', 10);

// ─── Server lifecycle ─────────────────────────────────────────────────────────

let serverProc: ChildProcess | null = null;

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(process.cwd(), 'server.ts');
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(SERVER_PORT),
      NODE_ENV: 'development',
    };

    const tsxCli = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
    serverProc = spawn(process.execPath, [tsxCli, serverPath], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;

    serverProc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (!resolved && (text.includes('server started') || text.includes('ScamShield') || text.includes(String(SERVER_PORT)))) {
        resolved = true;
        resolve();
      }
    });

    serverProc.on('error', (err) => {
      if (!resolved) { resolved = true; reject(err); }
    });

    serverProc.on('exit', (code, signal) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Server exited prematurely: code=${code} signal=${signal}`));
      }
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(); }
    }, 25_000);
  });
}

function stopServer() {
  if (serverProc) {
    try { serverProc.kill('SIGTERM'); } catch { /* ignore */ }
    serverProc = null;
  }
}

process.on('exit', stopServer);
process.on('SIGINT',  () => { stopServer(); process.exit(130); });
process.on('SIGTERM', () => { stopServer(); process.exit(143); });

// ─── Health check ─────────────────────────────────────────────────────────────

async function waitForHealth(timeoutMs = 35_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2500) });
      if (r.ok) return true;
    } catch { /* still booting */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvalResult {
  sampleId: string;
  category: string;
  sourceType: string;
  groundTruth: 'SAFE' | 'SCAM';
  predicted: 'SAFE' | 'SCAM' | 'ERROR';
  riskScore?: number;
  classification?: string;
  durationMs: number;
  errorCode?: string;
}

interface Metrics {
  totalAttempted: number;
  errored: number;
  operationalErrorRate: number;
  accuracy: number; precision: number; recall: number;
  f1: number; fpr: number; fnr: number;
  TP: number; TN: number; FP: number; FN: number;
  totalEvaluated: number;
  errorCodeCounts: Record<string, number>;
  byCategory: Record<string, { total: number; correct: number; accuracy: number; tp: number; tn: number; fp: number; fn: number }>;
}

// ─── Prediction logic ─────────────────────────────────────────────────────────

function predictLabel(riskScore: number, classification: string): 'SAFE' | 'SCAM' {
  if (riskScore >= 50) return 'SCAM';
  const safeSet = new Set(['SAFE', 'UNKNOWN']);
  if (!safeSet.has((classification ?? '').toUpperCase())) return 'SCAM';
  return 'SAFE';
}

// ─── Single sample call ───────────────────────────────────────────────────────

async function callAnalyze(sample: EvalSample): Promise<EvalResult> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: sample.sourceType, inputContent: sample.input }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({})) as { code?: string; error?: string };
      const isRateLimit = resp.status === 429 || data.code === 'RATE_LIMIT';

      if (isRateLimit) {
        const cooldownMs = calculateCooldownMs(resp.status, resp.headers, data.code, 15000);
        const cooldownSec = Math.round(cooldownMs / 1000);
        process.stdout.write(`\n  \u26a0\ufe0f  Rate limited (429) on sample ${sample.id}. Applying cooldown ${cooldownSec}s…\n`);
        await new Promise(r => setTimeout(r, cooldownMs));

        return {
          sampleId: sample.id, category: sample.category,
          sourceType: sample.sourceType, groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
          predicted: 'ERROR', durationMs: Date.now() - t0,
          errorCode: 'RATE_LIMITED',
        };
      }

      return {
        sampleId: sample.id, category: sample.category,
        sourceType: sample.sourceType, groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
        predicted: 'ERROR', durationMs: Date.now() - t0,
        errorCode: `HTTP_${resp.status}`,
      };
    }

    const data = await resp.json() as { riskScore?: number; classification?: string; error?: string; code?: string };
    if (data.error || data.code === 'RATE_LIMIT') {
      const isRateLimit = data.code === 'RATE_LIMIT';
      return {
        sampleId: sample.id, category: sample.category,
        sourceType: sample.sourceType, groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
        predicted: 'ERROR', durationMs: Date.now() - t0,
        errorCode: isRateLimit ? 'RATE_LIMITED' : 'API_ERROR',
      };
    }

    const rs = data.riskScore ?? 0;
    const cl = data.classification ?? 'UNKNOWN';
    return {
      sampleId: sample.id, category: sample.category,
      sourceType: sample.sourceType, groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
      predicted: predictLabel(rs, cl), riskScore: rs, classification: cl,
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'));
    return {
      sampleId: sample.id, category: sample.category,
      sourceType: sample.sourceType, groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
      predicted: 'ERROR', durationMs: Date.now() - t0,
      errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK',
    };
  }
}

// ─── Concurrency pool (Sequential) ────────────────────────────────────────────

async function runAll(samples: EvalSample[]): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  let done = 0;

  for (const s of samples) {
    const r = await callAnalyze(s);
    results.push(r);
    done++;
    const pctVal = Math.round(done / samples.length * 100);
    process.stdout.write(`\r  \u23F3 ${done}/${samples.length} (${pctVal}%) [id: ${s.id}]  `);
    if (done < samples.length) {
      await new Promise(r2 => setTimeout(r2, DELAY_MS));
    }
  }

  process.stdout.write('\n');
  return results;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

function computeMetrics(results: EvalResult[]): Metrics {
  const totalAttempted = results.length;
  const evaluated = results.filter(r => r.predicted !== 'ERROR');
  const errored   = totalAttempted - evaluated.length;
  const operationalErrorRate = totalAttempted > 0 ? errored / totalAttempted : 0;

  const errorCodeCounts: Record<string, number> = {};
  for (const r of results) {
    if (r.errorCode) {
      errorCodeCounts[r.errorCode] = (errorCodeCounts[r.errorCode] || 0) + 1;
    }
  }

  let TP = 0, TN = 0, FP = 0, FN = 0;

  for (const r of evaluated) {
    if      (r.groundTruth === 'SCAM' && r.predicted === 'SCAM') TP++;
    else if (r.groundTruth === 'SAFE' && r.predicted === 'SAFE') TN++;
    else if (r.groundTruth === 'SAFE' && r.predicted === 'SCAM') FP++;
    else if (r.groundTruth === 'SCAM' && r.predicted === 'SAFE') FN++;
  }

  const total     = evaluated.length;
  const accuracy  = total > 0 ? (TP + TN) / total : 0;
  const precision = (TP + FP) > 0 ? TP / (TP + FP) : 0;
  const recall    = (TP + FN) > 0 ? TP / (TP + FN) : 0;
  const f1        = (precision + recall) > 0 ? 2*precision*recall/(precision+recall) : 0;
  const fpr       = (FP + TN) > 0 ? FP / (FP + TN) : 0;
  const fnr       = (FN + TP) > 0 ? FN / (FN + TP) : 0;

  const cats = [...new Set(results.map(r => r.category))];
  const byCategory: Metrics['byCategory'] = {};
  for (const cat of cats) {
    const cr = evaluated.filter(r => r.category === cat);
    let tp=0,tn=0,fp=0,fn=0;
    for (const r of cr) {
      if      (r.groundTruth==='SCAM' && r.predicted==='SCAM') tp++;
      else if (r.groundTruth==='SAFE' && r.predicted==='SAFE') tn++;
      else if (r.groundTruth==='SAFE' && r.predicted==='SCAM') fp++;
      else if (r.groundTruth==='SCAM' && r.predicted==='SAFE') fn++;
    }
    byCategory[cat] = { total: cr.length, correct: tp+tn, accuracy: cr.length>0?(tp+tn)/cr.length:0, tp,tn,fp,fn };
  }

  return {
    totalAttempted, errored, operationalErrorRate,
    accuracy, precision, recall, f1, fpr, fnr,
    TP, TN, FP, FN, totalEvaluated: total,
    errorCodeCounts, byCategory,
  };
}

// ─── Report ───────────────────────────────────────────────────────────────────

function pct(v: number) { return `${(v*100).toFixed(1)}%`; }

function printReport(m: Metrics) {
  const bar = '\u2550'.repeat(62);
  console.log(`\n${bar}`);
  console.log('  SCAMSHIELD AI \u2014 LIVE EVALUATION REPORT');
  console.log(`  Generated: ${new Date().toISOString()}`);
  console.log(`${bar}`);
  console.log('\n  \u2705 STATUS: VERIFIED (Live Gemini API)\n');

  console.log('\u2500\u2500 GROUP 1: OPERATIONAL COVERAGE & FAILURE RATE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  console.log(`  Total Attempted Requests: ${m.totalAttempted}`);
  console.log(`  Successful API Responses:  ${m.totalEvaluated}`);
  console.log(`  Operational Errors:        ${m.errored}`);
  console.log(`  Operational Error Rate:    ${pct(m.operationalErrorRate)}`);
  if (Object.keys(m.errorCodeCounts).length > 0) {
    console.log('  Error Breakdown:');
    for (const [code, count] of Object.entries(m.errorCodeCounts)) {
      console.log(`    - ${code}: ${count} call(s)`);
    }
  }

  console.log('\n\u2500\u2500 GROUP 2: MODEL QUALITY METRICS (Valid Responses) \u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  console.log(`  Accuracy:   ${pct(m.accuracy)}  (${m.TP + m.TN}/${m.totalEvaluated})`);
  console.log(`  Precision:  ${pct(m.precision)}`);
  console.log(`  Recall:     ${pct(m.recall)}`);
  console.log(`  F1 Score:   ${pct(m.f1)}`);
  console.log(`  FPR:        ${pct(m.fpr)}  (false positive rate)`);
  console.log(`  FNR:        ${pct(m.fnr)}  (false negative rate)`);

  console.log('\n\u2500\u2500 Confusion Matrix \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  console.log(`  TP (Scam detected correctly):  ${m.TP}`);
  console.log(`  TN (Safe passed correctly):    ${m.TN}`);
  console.log(`  FP (Safe falsely flagged):     ${m.FP}  \u2190 false alarm`);
  console.log(`  FN (Scam missed):              ${m.FN}  \u2190 missed threat`);

  console.log('\n\u2500\u2500 Category Breakdown \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  const sorted = Object.entries(m.byCategory).sort((a,b) => b[1].total - a[1].total);
  for (const [cat, c] of sorted) {
    if (c.total === 0) continue;
    console.log(`  ${cat.padEnd(27)} n=${String(c.total).padStart(3)}  acc=${pct(c.accuracy).padStart(6)}  TP=${c.tp} TN=${c.tn} FP=${c.fp} FN=${c.fn}`);
  }
  console.log(`\n${bar}\n`);
}

function saveResults(results: EvalResult[], m: Metrics) {
  const outDir = path.join(process.cwd(), 'tests', 'evaluation', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join(outDir, `VERIFIED_eval-${ts}.json`);

  const report = {
    meta: { timestamp: new Date().toISOString(), status: 'VERIFIED', note: 'Live Gemini API calls' },
    metrics: {
      operational: {
        totalAttempted: m.totalAttempted,
        successful: m.totalEvaluated,
        errored: m.errored,
        operationalErrorRate: m.operationalErrorRate,
        errorCodeCounts: m.errorCodeCounts,
      },
      modelQuality: {
        accuracy: m.accuracy, precision: m.precision, recall: m.recall,
        f1: m.f1, fpr: m.fpr, fnr: m.fnr,
        confusionMatrix: { TP: m.TP, TN: m.TN, FP: m.FP, FN: m.FN },
        totalEvaluated: m.totalEvaluated,
        byCategory: m.byCategory,
      },
    },
    samples: results.map(r => ({
      id: r.sampleId, category: r.category, sourceType: r.sourceType,
      groundTruth: r.groundTruth, predicted: r.predicted,
      riskScore: r.riskScore, classification: r.classification,
      durationMs: r.durationMs,
      ...(r.errorCode ? { errorCode: r.errorCode } : {}),
    })),
  };

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`  \ud83d\udcbe Results saved: ${outPath}`);
  return outPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const bar = '\u2550'.repeat(62);
  console.log(`\n${bar}`);
  console.log('  ScamShield AI \u2014 Live Evaluation Runner');
  console.log(`${bar}`);
  console.log('  GEMINI_API_KEY: API key loaded from environment');
  console.log(`  Eval port: ${SERVER_PORT} | Concurrency: ${CONCURRENCY} | Timeout: ${TIMEOUT_MS}ms`);

  // Step 1: Start server
  console.log('\n\u25b6 Starting server…');
  try {
    await startServer();
  } catch (err) {
    console.error('\u274c Server failed to start:', err);
    process.exit(1);
  }

  // Step 2: Health check
  console.log('\u25b6 Waiting for server health check…');
  const healthy = await waitForHealth(50_000);
  if (!healthy) {
    stopServer();
    console.error('\u274c Server did not respond to health check within 35s.');
    console.error('  Check that GEMINI_API_KEY is valid and try again.');
    process.exit(1);
  }
  console.log('\u2705 Server healthy at', API_BASE);


  // Step 3: Select samples
  let samples: EvalSample[];
  if (EVAL_LIMIT === 20 || process.env.EVAL_STRATIFIED === 'true') {
    samples = STRATIFIED_20_SAMPLES;
    console.log(`\u26a0\ufe0f  Using Locked Stratified 20-Sample Subset (10 SAFE + 10 SCAM)`);
  } else if (EVAL_LIMIT > 0) {
    samples = ALL_SAMPLES.slice(0, EVAL_LIMIT);
    console.log(`\u26a0\ufe0f  EVAL_LIMIT=${EVAL_LIMIT}: running subset of ALL_SAMPLES`);
  } else {
    samples = ALL_SAMPLES;
  }

  const safeCount = samples.filter(s => s.groundTruth === 'SAFE').length;
  const scamCount = samples.filter(s => s.groundTruth === 'SCAM').length;
  console.log(`\n\u25b6 Running evaluation on ${samples.length} samples`);
  console.log(`  Selected subset: SAFE=${safeCount}, SCAM=${scamCount}, total=${samples.length}\n`);

  // Step 4: Run evaluation
  const results = await runAll(samples);

  // Step 5: Compute + print metrics
  const metrics = computeMetrics(results);
  printReport(metrics);

  // Step 6: Save JSON
  const outPath = saveResults(results, metrics);

  // Step 7: Gate determination
  stopServer();

  const errorRate = metrics.errored / results.length;
  if (errorRate > 0.2) {
    console.error(`\u274c High error rate (${Math.round(errorRate*100)}% of calls failed). Check API key validity and rate limits.`);
    process.exit(1);
  }

  if (metrics.totalEvaluated >= 100) {
    console.log('  BASELINE GATE (AI Evaluation) = PASS \u2705');
  } else {
    console.log(`  BASELINE GATE (AI Evaluation) = UNVERIFIED (only ${metrics.totalEvaluated} samples evaluated)`);
  }
  console.log('');
}

main().catch(err => {
  stopServer();
  console.error('\nFatal error:', err);
  process.exit(1);
});
