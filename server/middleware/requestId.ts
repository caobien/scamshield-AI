/**
 * server/middleware/requestId.ts
 * Attaches a unique request ID to every incoming request for traceability.
 * The ID is echoed back in the X-Request-Id response header.
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuidv4();
  req.context = {
    requestId,
    startTime: Date.now(),
  };
  res.setHeader('X-Request-Id', requestId);
  next();
}
