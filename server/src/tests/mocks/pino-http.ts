// Jest stub for pino-http used in middleware/index.ts.
// For tests we don't need HTTP logging; return a no-op middleware.

export function pinoHttp(_options?: any) {
  return (_req: any, _res: any, next: () => void) => next();
}

