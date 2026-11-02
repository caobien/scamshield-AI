/**
 * tests/evaluation/batchEvalRunner.ts
 * Full 173-sample evaluation runner — 3 batches, sequential, resume-safe.
 *
 * Batch layout (ALL_SAMPLES indices):
 *   Batch 1: [0, 60)   — 60 samples
 *   Batch 2: [60, 120) — 60 samples
 *   Batch 3: [120,173) — 53 samples
 *
 * Resume guarantees:
 *   - Checkpoint written atomically (rename) after EVERY sample
 *   - Sealed batch JSON written only on full batch completion
 *   - batch-state.json carries run metadata; old batches rejected on mismatch
 *
 * Status / gate rules:
 *   - status: VERIFIED        → all 173 attempted AND 0 errors
 *   - status: VERIFIED_PARTIAL→ all 173 attempted, 0 < errors <= 10%
 *   - status: UNVERIFIED      → all 173 attempted, errors > 10%
 *   - status: INCOMPLETE      → fewer than 173 attempted
 *   BASELINE GATE = PASS only when status === VERIFIED (0 errors, 173 samples)
 *
 * SECURITY: GEMINI_API_KEY read from .env only — never printed, logged,
 * or persisted to any output file.
 *
 * Usage (Windows PowerShell):
 *   $env:EVAL_DELAY_MS="6000"; npx tsx tests/evaluation/batchEvalRunner.ts
 *   # Force restart (clear existing checkpoints):
 *   Remove-Item tests\evaluation\results\batch-state.json -Force
 */

import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ALL_SAMPLES, EvalSample } from './evalDataset.js';
import { calculateCooldownMs, parseRetryAfterHeader } from './ratePacingUtils.js';

dotenv.config();

// --- Key guard: NEVER log the key value ---

const _apiKey = process.env.GEMINI_API_KEY ?? '';
if (!_apiKey || _apiKey.trim() === 'your_gemini_api_key_here' || _apiKey.trim().length < 20) {
  console.error('\n❌ GEMINI_API_KEY is missing or still a placeholder in .env');
  console.error('   Set it in .env and re-run. Do NOT pass it as a command-line argument.');
  process.exit(1);
}
// Key is not stored in any named constant — server child process inherits env.

// --- Configuration ---

const SERVER_PORT = parseInt(process.env.EVAL_SERVER_PORT || '3778', 10);
const API_BASE    = `http://localhost:${SERVER_PORT}`;
const DELAY_MS    = parseInt(process.env.EVAL_DELAY_MS    || '6000', 10);
const TIMEOUT_MS  = parseInt(process.env.EVAL_TIMEOUT_MS  || '45000', 10);

// Model name read from env (same var the server uses) — never the key.
const MODEL_NAME  = (process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim();

const RESULTS_DIR = path.join(process.cwd(), 'tests', 'evaluation', 'results');
const STATE_FILE  = path.join(RESULTS_DIR, 'batch-state.json');

const BATCH_DEFINITIONS = [
  { batchNum: 1, start: 0,   end: 60  },
  { batchNum: 2, start: 60,  end: 120 },
  { batchNum: 3, start: 120, end: 173 },
] as const;

// --- Dataset fingerprint ---

function computeDatasetFingerprint(): string {
  const ids  = ALL_SAMPLES.map(s => s.id).join('|');
  const hash = crypto.createHash('sha256').update(ids).digest('hex').slice(0, 16);
  return `n=${ALL_SAMPLES.length}:${ALL_SAMPLES[0]?.id}:${ALL_SAMPLES[ALL_SAMPLES.length - 1]?.id}:${hash}`;
}
const DATASET_FINGERPRINT = computeDatasetFingerprint();

// --- Run metadata ---

interface RunMetadata {
  datasetFingerprint: string;
  model: string;
  delayMs: number;
  startedAt: string;
}

function buildCurrentMetadata(startedAt?: string): RunMetadata {
  return { datasetFingerprint: DATASET_FINGERPRINT, model: MODEL_NAME, delayMs: DELAY_MS, startedAt: startedAt ?? new Date().toISOString() };
}

function metadataMatches(saved: RunMetadata, current: RunMetadata): { ok: boolean; reason?: string } {
  if (saved.datasetFingerprint !== current.datasetFingerprint)
    return { ok: false, reason: `Dataset changed: saved="${saved.datasetFingerprint}" vs current="${current.datasetFingerprint}"` };
  if (saved.model !== current.model)
    return { ok: false, reason: `Model changed: saved="${saved.model}" vs current="${current.model}"` };
  return { ok: true };
}

// --- Types ---

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

interface BatchCheckpoint {
  batchNum: number;
  runMetadata: RunMetadata;
  nextIndex: number;
  results: EvalResult[];
  lastUpdatedAt: string;
}

interface BatchState {
  runMetadata: RunMetadata;
  batchResults: Record<string, string | null>;
}

// --- Status / gate tiers ---

type EvalStatus = 'VERIFIED' | 'VERIFIED_PARTIAL' | 'UNVERIFIED' | 'INCOMPLETE';
type GateResult = 'PASS' | 'PASS_WITH_LIMITATIONS' | 'UNVERIFIED' | 'INCOMPLETE';

function determineStatus(totalAttempted: number, errored: number): EvalStatus {
  if (totalAttempted < 173 || errored > 0) return 'INCOMPLETE';
  return 'VERIFIED';
}

function determineGate(status: EvalStatus): GateResult {
  if (status === 'VERIFIED')         return 'PASS';
  if (status === 'VERIFIED_PARTIAL') return 'PASS_WITH_LIMITATIONS';
  return status; // 'UNVERIFIED' | 'INCOMPLETE'
}

// --- Server lifecycle ---

let serverProc: ChildProcess | null = null;

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(SERVER_PORT), NODE_ENV: 'development' };
    const tsxCli = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
    serverProc = spawn(process.execPath, [tsxCli, path.join(process.cwd(), 'server.ts')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let resolved = false;
    serverProc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (!resolved && (text.includes('server started') || text.includes('ScamShield') || text.includes(String(SERVER_PORT))))
        { resolved = true; resolve(); }
    });
    serverProc.on('error', err => { if (!resolved) { resolved = true; reject(err); } });
    serverProc.on('exit', (code, sig) => { if (!resolved) { resolved = true; reject(new Error(`Server exited: code=${code} signal=${sig}`)); } });
    setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 25_000);
  });
}

function stopServer() {
  if (serverProc) { try { serverProc.kill('SIGTERM'); } catch { /**/ } serverProc = null; console.log('  🛑 Server stopped.'); }
}

process.on('exit', stopServer);
process.on('SIGINT',  () => { stopServer(); process.exit(130); });
process.on('SIGTERM', () => { stopServer(); process.exit(143); });

// --- Health check ---

async function waitForHealth(timeoutMs = 45_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const r = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2500) }); if (r.ok) return true; }
    catch { /**/ }
    await sleep(1000);
  }
  return false;
}

// --- Utilities ---

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
function pct(v: number): string { return `${(v * 100).toFixed(1)}%`; }

function atomicWrite(filePath: string, content: string): void {
  const tmp = filePath + `.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, filePath);
}

// --- Prediction logic ---

function predictLabel(riskScore: number, classification: string): 'SAFE' | 'SCAM' {
  if (riskScore >= 50) return 'SCAM';
  return new Set(['SAFE', 'UNKNOWN']).has((classification ?? '').toUpperCase()) ? 'SAFE' : 'SCAM';
}

// --- Single-sample API call ---

const BACKOFF_SCHEDULE_SEC = [12, 30, 60, 120, 240];

async function callAnalyzeWithRetry(sample: EvalSample): Promise<EvalResult> {
  const MAX_RETRIES = 5;
  let attempt = 0;

  while (true) {
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

      let isRL = resp.status === 429;
      let data: { riskScore?: number; classification?: string; code?: string; error?: string } = {};

      if (resp.ok) {
        data = await resp.json() as typeof data;
        if (data.code === 'RATE_LIMIT' || data.error?.toLowerCase().includes('quota') || data.error?.toLowerCase().includes('rate limit')) {
          isRL = true;
        }
      } else {
        data = await resp.json().catch(() => ({})) as typeof data;
        if (data.code === 'RATE_LIMIT') {
          isRL = true;
        }
      }

      if (isRL) {
        attempt++;
        let schedSec = BACKOFF_SCHEDULE_SEC[Math.min(attempt - 1, BACKOFF_SCHEDULE_SEC.length - 1)];
        const retryAfterHeader = resp.headers.get('retry-after');
        if (retryAfterHeader) {
          const parsed = parseRetryAfterHeader(retryAfterHeader, schedSec);
          if (parsed > 0) schedSec = Math.max(schedSec, parsed);
        }
        const jitter = schedSec * 0.15 * (Math.random() * 2 - 1);
        const backoffSec = Math.max(10, Math.round(schedSec + jitter));

        console.log(`[RATE-LIMIT] sample=${sample.id}`);
        if (attempt <= MAX_RETRIES) {
          console.log(`[RETRY] attempt=${attempt}`);
          console.log(`[RETRY] backoff=${backoffSec}s`);
          await sleep(backoffSec * 1000);
          continue;
        } else {
          console.log(`[ERROR] sample=${sample.id} error=RATE_LIMITED`);
          return makeError(sample, t0, 'RATE_LIMITED');
        }
      }

      if (!resp.ok) {
        console.log(`[ERROR] sample=${sample.id} error=HTTP_${resp.status}`);
        return makeError(sample, t0, `HTTP_${resp.status}`);
      }

      if (data.error) {
        console.log(`[ERROR] sample=${sample.id} error=API_ERROR`);
        return makeError(sample, t0, 'API_ERROR');
      }

      console.log(`[SUCCESS] sample=${sample.id}`);
      return {
        sampleId: sample.id,
        category: sample.category,
        sourceType: sample.sourceType,
        groundTruth: sample.groundTruth as 'SAFE' | 'SCAM',
        predicted: predictLabel(data.riskScore ?? 0, data.classification ?? 'UNKNOWN'),
        riskScore: data.riskScore,
        classification: data.classification,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      clearTimeout(timer);
      const isTO = err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'));
      console.log(`[ERROR] sample=${sample.id} error=${isTO ? 'TIMEOUT' : 'NETWORK'}`);
      return makeError(sample, t0, isTO ? 'TIMEOUT' : 'NETWORK');
    }
  }
}

function makeError(sample: EvalSample, t0: number, errorCode: string): EvalResult {
  return { sampleId: sample.id, category: sample.category, sourceType: sample.sourceType,
    groundTruth: sample.groundTruth as 'SAFE' | 'SCAM', predicted: 'ERROR', durationMs: Date.now() - t0, errorCode };
}

// --- Checkpoint helpers ---

function checkpointPath(batchNum: number) { return path.join(RESULTS_DIR, `checkpoint-batch-${batchNum}.json`); }

function loadCheckpoint(batchNum: number, meta: RunMetadata): BatchCheckpoint | null {
  try {
    const cp = JSON.parse(fs.readFileSync(checkpointPath(batchNum), 'utf-8')) as BatchCheckpoint;
    const m = metadataMatches(cp.runMetadata, meta);
    if (!m.ok) { console.log(`  ⚠️  Checkpoint batch ${batchNum} metadata mismatch: ${m.reason}. Ignoring.`); return null; }
    return cp;
  } catch { return null; }
}

function writeCheckpoint(cp: BatchCheckpoint): void {
  atomicWrite(checkpointPath(cp.batchNum), JSON.stringify({ ...cp, lastUpdatedAt: new Date().toISOString() }, null, 2));
}

function deleteCheckpoint(batchNum: number): void {
  try { const p = checkpointPath(batchNum); if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /**/ }
}

// --- Batch state ---

function loadState(meta: RunMetadata): BatchState {
  try {
    if (!fs.existsSync(STATE_FILE)) return freshState(meta);
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as BatchState;
    const m = metadataMatches(saved.runMetadata, meta);
    if (!m.ok) {
      console.warn(`\n  ⚠️  batch-state.json mismatch:\n     ${m.reason}`);
      console.warn(`  Previous sealed batches WILL NOT be reused. Starting fresh.\n`);
      return freshState(meta);
    }
    return saved;
  } catch { return freshState(meta); }
}

function freshState(meta: RunMetadata): BatchState {
  return { runMetadata: meta, batchResults: { '1': null, '2': null, '3': null } };
}

function saveState(state: BatchState): void { atomicWrite(STATE_FILE, JSON.stringify(state, null, 2)); }

function sealBatch(batchNum: number, results: EvalResult[]): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fp = path.join(RESULTS_DIR, `batch-${batchNum}-${ts}.json`);
  atomicWrite(fp, JSON.stringify({ batchNum, timestamp: new Date().toISOString(), sampleCount: results.length,
    model: MODEL_NAME, delayMs: DELAY_MS, datasetFingerprint: DATASET_FINGERPRINT, results }, null, 2));
  return fp;
}

function loadSealedResults(filePath: string, meta: RunMetadata, expectedCount: number): EvalResult[] | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (raw.datasetFingerprint && raw.datasetFingerprint !== meta.datasetFingerprint)
      { console.warn(`  ⚠️  Sealed ${path.basename(filePath)}: wrong dataset fingerprint. Skipping.`); return null; }
    if (raw.model && raw.model !== meta.model)
      { console.warn(`  ⚠️  Sealed ${path.basename(filePath)}: model "${raw.model}" != current "${meta.model}". Skipping.`); return null; }
    const results = raw.results as EvalResult[];
    if (!results || results.length < expectedCount || results.some(r => r.predicted === 'ERROR')) {
      console.warn(`  ⚠️  Sealed ${path.basename(filePath)}: contains errored/incomplete samples (${results?.length ?? 0}/${expectedCount}). Skipping.`);
      return null;
    }
    return results;
  } catch { return null; }
}

// --- Run batch with per-sample checkpoint (retry-aware) ---
//
// Resume semantics:
//   VALID  (predicted: SAFE | SCAM) → skip, keep existing result, no API call
//   ERROR  (predicted: ERROR)       → ALWAYS retry regardless of error code
//   Not yet attempted               → attempt fresh
//
// This ensures RATE_LIMITED / TIMEOUT / NETWORK errors are never counted as
// "done" and are automatically re-run when quota becomes available.

async function runBatch(
  batchNum: number,
  samples: EvalSample[],
  meta: RunMetadata,
  previousSealedResults: EvalResult[] = []
): Promise<EvalResult[]> {
  const cp = loadCheckpoint(batchNum, meta);

  // validById: sampleId → result for samples that have a real API response.
  // ERROR results are intentionally excluded — they must be retried.
  const validById = new Map<string, EvalResult>();

  if (cp) {
    for (const r of cp.results) {
      if (r.predicted === 'SAFE' || r.predicted === 'SCAM') {
        validById.set(r.sampleId, r);
      }
    }
    const errCount = cp.results.filter(r => r.predicted === 'ERROR').length;
    const unstarted = Math.max(0, samples.length - cp.nextIndex);
    const errCodes  = [...new Set(cp.results.filter(r => r.predicted === 'ERROR').map(r => r.errorCode ?? '?'))];
    console.log(
      `  ♻️  Batch ${batchNum}: ${validById.size} valid retained` +
      ` | ${errCount} error(s) to retry [${errCodes.join(', ')}]` +
      ` | ${unstarted} not yet attempted`
    );
  }

  // acc: working map of sampleId → best result (starts with all valid results).
  const acc = new Map<string, EvalResult>(validById);
  const startIdx = (batchNum - 1) * 60;

  let consecutiveQuotaErrors = 0;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const globalIdx = startIdx + i;

    // Skip ONLY samples that already have a valid (SAFE/SCAM) response.
    if (validById.has(s.id)) continue;

    // Calculate logging metrics across all samples
    const combinedSoFar = [...previousSealedResults, ...Array.from(acc.values())];
    const validCount = combinedSoFar.filter(r => r.predicted === 'SAFE' || r.predicted === 'SCAM').length;
    const rateLimitedCount = combinedSoFar.filter(r => r.errorCode === 'RATE_LIMITED').length;
    const errorCount = combinedSoFar.filter(r => r.predicted === 'ERROR').length;

    console.log(`\n[AI-EVAL] Dataset: ${ALL_SAMPLES.length}`);
    console.log(`[AI-EVAL] Model: ${MODEL_NAME}`);
    console.log(`[AI-EVAL] Resume index: ${globalIdx}`);
    console.log(`[AI-EVAL] Valid results: ${validCount}/${ALL_SAMPLES.length}`);
    console.log(`[AI-EVAL] Rate limited: ${rateLimitedCount}`);
    console.log(`[AI-EVAL] Errors: ${errorCount}`);
    console.log(`[AI-EVAL] Processing sample: ${globalIdx + 1}/${ALL_SAMPLES.length}`);

    const r = await callAnalyzeWithRetry(s);
    acc.set(s.id, r);

    // Checkpoint: ordered results for all samples processed so far in this batch.
    const orderedResults = samples.filter(sm => acc.has(sm.id)).map(sm => acc.get(sm.id)!);
    writeCheckpoint({
      batchNum, runMetadata: meta,
      nextIndex: i + 1,
      results: orderedResults,
      lastUpdatedAt: '',
    });

    if (r.predicted === 'ERROR' && r.errorCode === 'RATE_LIMITED') {
      consecutiveQuotaErrors++;
      if (consecutiveQuotaErrors >= 3) {
        console.log(`\n  ⚠️ Persistent Rate Limit / Quota Exhaustion hit on ${consecutiveQuotaErrors} consecutive samples.`);
        console.log(`     Halting batch ${batchNum} safely. Checkpoint preserved.`);
        break;
      }
    } else {
      consecutiveQuotaErrors = 0;
    }

    if (i < samples.length - 1) await sleep(DELAY_MS);
  }

  // Return results in original sample order.
  return samples.map(s => acc.get(s.id)).filter((r): r is EvalResult => r !== undefined);
}

// --- Aggregate metrics ---

interface AggregateMetrics {
  totalAttempted: number; successful: number; errored: number;
  operationalErrorRate: number; operationalCoverage: number;
  errorCodeCounts: Record<string, number>;
  totalEvaluated: number;
  TP: number; TN: number; FP: number; FN: number;
  accuracy: number; precision: number; recall: number; f1: number; fpr: number; fnr: number;
  byCategory: Record<string, { total: number; correct: number; accuracy: number; tp: number; tn: number; fp: number; fn: number }>;
}

function computeAggregate(allResults: EvalResult[]): AggregateMetrics {
  const totalAttempted = allResults.length;
  const evaluated      = allResults.filter(r => r.predicted !== 'ERROR');
  const errored        = totalAttempted - evaluated.length;
  const errorCodeCounts: Record<string, number> = {};
  for (const r of allResults) if (r.errorCode) errorCodeCounts[r.errorCode] = (errorCodeCounts[r.errorCode] ?? 0) + 1;

  let TP = 0, TN = 0, FP = 0, FN = 0;
  for (const r of evaluated) {
    if      (r.groundTruth === 'SCAM' && r.predicted === 'SCAM') TP++;
    else if (r.groundTruth === 'SAFE' && r.predicted === 'SAFE') TN++;
    else if (r.groundTruth === 'SAFE' && r.predicted === 'SCAM') FP++;
    else if (r.groundTruth === 'SCAM' && r.predicted === 'SAFE') FN++;
  }
  const n = evaluated.length;
  const accuracy  = n > 0 ? (TP + TN) / n : 0;
  const precision = (TP + FP) > 0 ? TP / (TP + FP) : 0;
  const recall    = (TP + FN) > 0 ? TP / (TP + FN) : 0;
  const f1        = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const fpr       = (FP + TN) > 0 ? FP / (FP + TN) : 0;
  const fnr       = (FN + TP) > 0 ? FN / (FN + TP) : 0;

  const cats = [...new Set(allResults.map(r => r.category))].sort();
  const byCategory: AggregateMetrics['byCategory'] = {};
  for (const cat of cats) {
    const cr = evaluated.filter(r => r.category === cat);
    let tp = 0, tn = 0, fp = 0, fn = 0;
    for (const r of cr) {
      if      (r.groundTruth === 'SCAM' && r.predicted === 'SCAM') tp++;
      else if (r.groundTruth === 'SAFE' && r.predicted === 'SAFE') tn++;
      else if (r.groundTruth === 'SAFE' && r.predicted === 'SCAM') fp++;
      else if (r.groundTruth === 'SCAM' && r.predicted === 'SAFE') fn++;
    }
    byCategory[cat] = { total: cr.length, correct: tp + tn, accuracy: cr.length > 0 ? (tp + tn) / cr.length : 0, tp, tn, fp, fn };
  }
  return { totalAttempted, successful: n, errored,
    operationalErrorRate: totalAttempted > 0 ? errored / totalAttempted : 0,
    operationalCoverage:  totalAttempted > 0 ? n / totalAttempted : 0,
    errorCodeCounts, totalEvaluated: n, TP, TN, FP, FN, accuracy, precision, recall, f1, fpr, fnr, byCategory };
}

// --- Baseline delta ---

interface BaselineInfo {
  found: boolean; file?: string; sampleCount?: number;
  accuracy?: number | null; precision?: number | null; recall?: number | null;
  f1?: number | null; fpr?: number | null; fnr?: number | null; limitationNote: string;
}

function findBestBaseline(): BaselineInfo {
  try {
    for (const f of fs.readdirSync(RESULTS_DIR).filter(f => f.startsWith('VERIFIED_eval-') && f.endsWith('.json')).sort().reverse()) {
      const raw = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8'));
      if ((raw.meta?.status ?? '') !== 'VERIFIED') continue;
      const n: number = raw.metrics?.modelQuality?.totalEvaluated ?? raw.metrics?.operational?.successful ?? (raw.samples?.length ?? 0);
      if (n >= 100) continue; // skip large/aggregate runs
      const mq = raw.metrics?.modelQuality ?? {};
      return {
        found: true, file: f, sampleCount: n,
        accuracy: mq.accuracy ?? null, precision: mq.precision ?? null,
        recall: mq.recall ?? null, f1: mq.f1 ?? null, fpr: mq.fpr ?? null, fnr: mq.fnr ?? null,
        limitationNote:
          `⚠️  Baseline is a ${n}-sample smoke test — NOT a full-dataset run.\n` +
          `   Binomial 95% CI ≈ ±${Math.round(196 / Math.sqrt(n))}pp. Delta values are\n` +
          `   DIRECTIONAL INDICATORS only. NOT statistical proof of performance.`,
      };
    }
  } catch { /**/ }
  return { found: false, limitationNote: 'No VERIFIED small-sample baseline found. This run establishes the first full-dataset baseline.' };
}

function dStr(curr: number | null | undefined, base: number | null | undefined): string {
  if (curr == null || base == null) return '   n/a';
  const d = curr - base; return `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}pp`;
}

// --- Console report ---

function printReport(m: AggregateMetrics, status: EvalStatus, gate: GateResult, baseline: BaselineInfo, batchFiles: string[]): void {
  const bar = '═'.repeat(72);
  const div = '─'.repeat(72);
  const safe = ALL_SAMPLES.filter(s => s.groundTruth === 'SAFE').length;
  const scam = ALL_SAMPLES.filter(s => s.groundTruth === 'SCAM').length;

  console.log(`\n${bar}`);
  console.log('  SCAMSHIELD AI — FULL EVALUATION AGGREGATE REPORT');
  console.log(`  Generated  : ${new Date().toISOString()}`);
  console.log(`  Model      : ${MODEL_NAME}`);
  console.log(`  Dataset    : ${ALL_SAMPLES.length} samples (${safe} SAFE, ${scam} SCAM)`);
  console.log(`  Fingerprint: ${DATASET_FINGERPRINT}`);
  console.log(`  Batches    : ${batchFiles.length}/3 completed`);
  console.log(`  Run status : ${status}`);
  console.log(`${bar}`);

  console.log(`\n${div}`);
  console.log('  GROUP 1 — OPERATIONAL COVERAGE  (independent of model quality)');
  console.log(div);
  console.log(`  Total Attempted      : ${m.totalAttempted} / 173`);
  console.log(`  Successful responses : ${m.successful}`);
  console.log(`  Operational Errors   : ${m.errored}`);
  console.log(`  Operational Error %  : ${pct(m.operationalErrorRate)}`);
  console.log(`  Operational Coverage : ${pct(m.operationalCoverage)}`);
  if (Object.keys(m.errorCodeCounts).length > 0) {
    console.log('  Errors by code:');
    for (const [code, count] of Object.entries(m.errorCodeCounts).sort())
      console.log(`    ${code.padEnd(20)}: ${count}`);
  } else { console.log('  Errors by code       : (none)'); }

  console.log(`\n${div}`);
  console.log(`  GROUP 2 — MODEL QUALITY  (${m.totalEvaluated} successful responses only)`);
  if (m.errored > 0) {
    console.log(`  ⚠️  ${m.errored} error(s) EXCLUDED from quality metrics below.`);
    console.log(`     Metrics are a lower bound; true performance may differ.`);
  }
  console.log(div);
  console.log(`  Accuracy   : ${pct(m.accuracy).padStart(7)}  (${m.TP + m.TN}/${m.totalEvaluated} correct)`);
  console.log(`  Precision  : ${pct(m.precision).padStart(7)}`);
  console.log(`  Recall     : ${pct(m.recall).padStart(7)}`);
  console.log(`  F1 Score   : ${pct(m.f1).padStart(7)}`);
  console.log(`  FPR        : ${pct(m.fpr).padStart(7)}  (false positive rate)`);
  console.log(`  FNR        : ${pct(m.fnr).padStart(7)}  (false negative rate)`);

  console.log(`\n${div}`);
  console.log('  CONFUSION MATRIX  (successful responses only)');
  console.log(div);
  console.log(`  TP Scam detected correctly : ${String(m.TP).padStart(4)}`);
  console.log(`  TN Safe passed correctly   : ${String(m.TN).padStart(4)}`);
  console.log(`  FP Safe falsely flagged    : ${String(m.FP).padStart(4)}  ← false alarm`);
  console.log(`  FN Scam missed             : ${String(m.FN).padStart(4)}  ← missed threat`);

  console.log(`\n${div}`);
  console.log('  PER-CATEGORY BREAKDOWN');
  console.log(div);
  for (const [cat, c] of Object.entries(m.byCategory).sort((a, b) => b[1].total - a[1].total)) {
    if (c.total === 0) continue;
    console.log(`  ${cat.padEnd(28)} n=${String(c.total).padStart(3)}  acc=${pct(c.accuracy).padStart(6)}  TP=${c.tp} TN=${c.tn} FP=${c.fp} FN=${c.fn}`);
  }

  console.log(`\n${div}`);
  console.log('  BASELINE vs FULL-DATASET DELTA');
  console.log(div);
  console.log(`  ${baseline.limitationNote}`);
  if (baseline.found) {
    console.log(`\n  Reference: ${baseline.file} (n=${baseline.sampleCount})`);
    console.log(`  ${'Metric'.padEnd(12)} ${'Baseline'.padStart(9)} ${'Current'.padStart(9)} ${'Delta'.padStart(9)}`);
    console.log(`  ${''.padEnd(42, '─')}`);
    const rows: [string, number | null | undefined, number][] = [
      ['Accuracy', baseline.accuracy, m.accuracy], ['Precision', baseline.precision, m.precision],
      ['Recall',   baseline.recall,   m.recall  ], ['F1',        baseline.f1,        m.f1       ],
      ['FPR',      baseline.fpr,      m.fpr     ], ['FNR',       baseline.fnr,       m.fnr      ],
    ];
    for (const [name, bv, cv] of rows)
      console.log(`  ${name.padEnd(12)} ${(bv != null ? pct(bv) : 'n/a').padStart(9)} ${pct(cv).padStart(9)} ${dStr(cv, bv).padStart(9)}`);
  }

  console.log(`\n${div}`);
  console.log('  BASELINE GATE DETERMINATION');
  console.log(div);
  switch (gate) {
    case 'PASS':
      console.log('  ✅ BASELINE GATE = PASS');
      console.log(`     All ${m.totalAttempted}/173 samples. Zero operational errors.`);
      console.log(`     Accuracy=${pct(m.accuracy)}, F1=${pct(m.f1)}, FPR=${pct(m.fpr)}, FNR=${pct(m.fnr)}`);
      break;
    case 'PASS_WITH_LIMITATIONS':
      console.log('  ⚠️  BASELINE GATE = PASS WITH LIMITATIONS');
      console.log(`     All ${m.totalAttempted}/173 samples, ${m.errored} error(s) (${pct(m.operationalErrorRate)}).`);
      console.log(`     Quality metrics on ${m.totalEvaluated} responses only — treat as lower bound.`);
      console.log(`     Accuracy=${pct(m.accuracy)}, F1=${pct(m.f1)}`);
      break;
    case 'UNVERIFIED':
      console.log('  ❌ BASELINE GATE = UNVERIFIED');
      console.log(`     ${m.errored} errors (${pct(m.operationalErrorRate)} > 10%). Metrics unreliable.`);
      break;
    case 'INCOMPLETE':
      console.log('  🔴 BASELINE GATE = INCOMPLETE');
      console.log(`     Only ${m.totalAttempted}/173 samples attempted. Re-run to resume.`);
      break;
  }
  console.log(`\n${bar}\n`);
}

// --- Save aggregate JSON ---

function saveAggregateReport(m: AggregateMetrics, status: EvalStatus, gate: GateResult, baseline: BaselineInfo, batchFiles: string[], allResults: EvalResult[]): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join(RESULTS_DIR, `${status}_aggregate-full173-${ts}.json`);
  atomicWrite(outPath, JSON.stringify({
    meta: {
      timestamp: new Date().toISOString(), status, baselineGate: gate,
      model: MODEL_NAME, datasetFingerprint: DATASET_FINGERPRINT,
      totalDatasetSamples: ALL_SAMPLES.length, batchFiles,
      // No API key stored here
      gateNote: gate === 'PASS'
        ? `All ${m.totalAttempted}/173, zero errors. Reliable.`
        : gate === 'PASS_WITH_LIMITATIONS'
          ? `All ${m.totalAttempted}/173 with ${m.errored} error(s). Lower bound only.`
          : gate === 'UNVERIFIED'
            ? `Error rate ${pct(m.operationalErrorRate)} > 10%. Unreliable.`
            : `Only ${m.totalAttempted}/173 attempted.`,
    },
    baseline: baseline.found
      ? { file: baseline.file, sampleCount: baseline.sampleCount, limitationNote: baseline.limitationNote,
          metrics: { accuracy: baseline.accuracy, precision: baseline.precision, recall: baseline.recall, f1: baseline.f1, fpr: baseline.fpr, fnr: baseline.fnr } }
      : { found: false, limitationNote: baseline.limitationNote },
    metrics: {
      operational: {
        totalAttempted: m.totalAttempted, successful: m.successful, errored: m.errored,
        operationalErrorRate: m.operationalErrorRate, operationalCoverage: m.operationalCoverage,
        errorCodeCounts: m.errorCodeCounts,
        coverageNote: m.errored > 0
          ? `${m.errored} sample(s) returned ERROR; excluded from quality metrics.`
          : 'No errors. All samples included in quality metrics.',
      },
      modelQuality: {
        note: `Computed on ${m.totalEvaluated} successful responses only.`,
        totalEvaluated: m.totalEvaluated,
        accuracy: m.accuracy, precision: m.precision, recall: m.recall, f1: m.f1, fpr: m.fpr, fnr: m.fnr,
        confusionMatrix: { TP: m.TP, TN: m.TN, FP: m.FP, FN: m.FN },
        byCategory: m.byCategory,
      },
    },
    samples: allResults.map(r => ({
      id: r.sampleId, category: r.category, sourceType: r.sourceType,
      groundTruth: r.groundTruth, predicted: r.predicted,
      riskScore: r.riskScore, classification: r.classification, durationMs: r.durationMs,
      ...(r.errorCode ? { errorCode: r.errorCode } : {}),
    })),
  }, null, 2));
  return outPath;
}

// --- Main ---

async function main() {
  const bar = '═'.repeat(72);
  console.log(`\n${bar}`);
  console.log('  ScamShield AI — Full 173-Sample Batch Evaluation Runner');
  console.log(`${bar}`);
  console.log(`  Model      : ${MODEL_NAME}`);
  console.log(`  Dataset    : ${ALL_SAMPLES.length} samples | fingerprint: ${DATASET_FINGERPRINT}`);
  console.log(`  Batches    : 3  (60 + 60 + 53 = 173)`);
  console.log(`  Concurrency: 1 (strictly sequential)`);
  console.log(`  Delay      : ${DELAY_MS}ms`);
  console.log(`  Timeout    : ${TIMEOUT_MS}ms`);
  console.log(`  Port       : ${SERVER_PORT}`);
  console.log(`  GEMINI_API_KEY: [present — not logged]`);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Preserve startedAt across resume runs
  let existingStartedAt: string | undefined;
  try {
    if (fs.existsSync(STATE_FILE))
      existingStartedAt = (JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as BatchState).runMetadata?.startedAt;
  } catch { /**/ }

  const META  = buildCurrentMetadata(existingStartedAt);
  const state = loadState(META);
  if (!existingStartedAt) state.runMetadata.startedAt = META.startedAt;
  saveState(state);

  const done = Object.entries(state.batchResults).filter(([, v]) => v && fs.existsSync(v as string)).map(([k]) => k);
  if (done.length > 0) console.log(`\n  ♻️  RESUME: sealed batches: ${done.join(', ')}  (delete ${STATE_FILE} to restart)`);

  console.log('\n▶ Starting server…');
  try { await startServer(); } catch (e) { console.error('❌ Server failed:', e); process.exit(1); }

  console.log('▶ Waiting for health check…');
  if (!await waitForHealth(50_000)) { stopServer(); console.error('❌ Health check timeout.'); process.exit(1); }
  console.log(`✅ Server healthy at ${API_BASE}`);

  const allResults: EvalResult[] = [];

  for (const { batchNum, start, end } of BATCH_DEFINITIONS) {
    const key = String(batchNum);
    const sealed = state.batchResults[key];
    const samples = ALL_SAMPLES.slice(start, end);

    if (sealed && fs.existsSync(sealed as string)) {
      const prev = loadSealedResults(sealed as string, META, samples.length);
      if (prev) {
        console.log(`\n  ♻️  Batch ${batchNum}: reusing sealed → ${path.basename(sealed as string)}`);
        allResults.push(...prev); continue;
      }
      console.log(`  ⚠️  Batch ${batchNum}: sealed file rejected. Re-running.`);
      state.batchResults[key] = null; saveState(state);
    }

    const sN = samples.filter(s => s.groundTruth === 'SAFE').length;
    const cN = samples.filter(s => s.groundTruth === 'SCAM').length;
    console.log(`\n  ─── Batch ${batchNum}/3 [${start}–${end - 1}] — ${samples.length} samples (${sN} SAFE, ${cN} SCAM) ───`);

    const res = await runBatch(batchNum, samples, META, allResults);
    allResults.push(...res);

    const ok = res.filter(r => r.predicted !== 'ERROR').length;
    const errors = res.length - ok;

    if (res.length === samples.length && errors === 0) {
      const sealedPath = sealBatch(batchNum, res);
      deleteCheckpoint(batchNum);
      state.batchResults[key] = sealedPath; saveState(state);
      console.log(`  💾 Batch ${batchNum} sealed: ${path.basename(sealedPath)}`);
      console.log(`     OK: ${ok}/${res.length} | Errors: 0`);
    } else {
      console.log(`  ⏸️  Batch ${batchNum} paused: ${ok}/${samples.length} valid results, ${errors} errors. Checkpoint preserved.`);
    }

    if (batchNum < 3) { console.log(`  ⏸️  Rest 5s…`); await sleep(5000); }
  }

  stopServer();

  console.log('\n▶ Computing aggregate…');
  const metrics  = computeAggregate(allResults);
  const status   = determineStatus(metrics.totalAttempted, metrics.errored);
  const gate     = determineGate(status);
  const baseline = findBestBaseline();
  const files    = Object.values(state.batchResults).filter(Boolean) as string[];

  printReport(metrics, status, gate, baseline, files);

  const agg = saveAggregateReport(metrics, status, gate, baseline, files, allResults);
  console.log(`  💾 Aggregate report: ${agg}\n`);

  if (gate === 'INCOMPLETE' || gate === 'UNVERIFIED') process.exit(1);
}

main().catch(err => { stopServer(); console.error('\nFatal:', err); process.exit(1); });