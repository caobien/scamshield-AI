/**
 * server/types.ts
 * Server-side type definitions and Express request augmentation.
 */
import type { Request } from 'express';

export type SourceType = 'MESSAGE' | 'SCREENSHOT' | 'URL';

export interface RequestContext {
  requestId: string;
  startTime: number;
  sourceType?: SourceType;
}

/** Augment Express Request with our context fields */
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

export interface SafeErrorResponse {
  error: string;
  requestId?: string;
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  version: string;
}

export interface GeminiCallOptions {
  model: string;
  systemInstruction: string;
  contents: unknown;
  timeoutMs: number;
  maxRetries: number;
  /** For logging only — does NOT get logged as user content */
  requestId: string;
}
