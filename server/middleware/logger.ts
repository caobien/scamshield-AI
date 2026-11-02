/**
 * server/middleware/logger.ts
 * Structured JSON logging for observability.
 * NEVER logs user message content, base64 data, OTPs, passwords, or API keys.
 * Logged fields: requestId, method, path, statusCode, latencyMs, sourceType,
 *                outcome, retryCount, errorCode.
 */
import { Request, Response, NextFunction } from 'express';

export interface StructuredLogEntry {
  ts: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  requestId: string;
  method: string;
  path: string;
  statusCode?: number;
  latencyMs?: number;
  sourceType?: string;
  outcome?: 'success' | 'client_error' | 'server_error' | 'rate_limited';
  retryCount?: number;
  errorCode?: string;
  msg?: string;
}

function writeLog(entry: StructuredLogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === 'ERROR' || entry.level === 'WARN') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

/** Request lifecycle logger middleware */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.context?.requestId || 'unknown';
  const startTime = req.context?.startTime || Date.now();

  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    let outcome: StructuredLogEntry['outcome'] = 'success';
    if (statusCode === 429) outcome = 'rate_limited';
    else if (statusCode >= 500) outcome = 'server_error';
    else if (statusCode >= 400) outcome = 'client_error';

    writeLog({
      ts: new Date().toISOString(),
      level: statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      latencyMs,
      sourceType: req.context?.sourceType,
      outcome,
    });
  });

  next();
}

/** Utility for server-internal logs (startup, health, etc.) */
export function log(level: StructuredLogEntry['level'], msg: string, extra?: Record<string, unknown>): void {
  writeLog({
    ts: new Date().toISOString(),
    level,
    requestId: 'system',
    method: '',
    path: '',
    msg,
    ...extra,
  });
}

/** Utility for logging within a request context, with retry count etc. */
export function logRequest(
  requestId: string,
  level: StructuredLogEntry['level'],
  msg: string,
  extra?: Partial<StructuredLogEntry>
): void {
  writeLog({
    ts: new Date().toISOString(),
    level,
    requestId,
    method: '',
    path: '',
    msg,
    ...extra,
  });
}
