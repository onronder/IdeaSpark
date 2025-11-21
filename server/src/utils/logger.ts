import pino from 'pino';
import { config } from '../config';

// Create logger instance
export const logger = pino({
  level: config.logging.level,
  transport: config.logging.pretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: req.headers ? {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      } : undefined,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  redact: {
    paths: [
      'password',
      'token',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
      '*.apiKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
});

// Child logger factory
export const createLogger = (module: string) => {
  return logger.child({ module });
};