import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Get request ID from header or generate new one
  const requestId = req.headers['x-request-id'] as string || uuidv4();

  // Attach to request object
  req.id = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
}