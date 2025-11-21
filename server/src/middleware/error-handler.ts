import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError } from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { captureException } from '../utils/sentry';
import { ApiError } from '../utils/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error({
    err,
    req: {
      id: req.id,
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body,
    },
  }, 'Request error');

  // Capture in Sentry
  captureException(err, {
    requestId: req.id,
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id,
  });

  // Handle different error types
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // API Error (custom errors)
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  }
  // Zod validation error
  else if (err instanceof z.ZodError) {
    statusCode = 422;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // Prisma errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Resource already exists';
      code = 'RESOURCE_ALREADY_EXISTS';
      details = { field: err.meta?.target };
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Resource not found';
      code = 'RESOURCE_NOT_FOUND';
    } else {
      statusCode = 400;
      message = 'Database operation failed';
      code = 'DATABASE_ERROR';
    }
  }
  // JWT errors
  else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
    code = 'TOKEN_INVALID';
  }
  // Syntax/Type errors
  else if (err instanceof SyntaxError || err instanceof TypeError) {
    statusCode = 400;
    message = 'Bad request';
    code = 'BAD_REQUEST';
  }
  // CORS error
  else if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = 'CORS policy violation';
    code = 'CORS_ERROR';
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date(),
      path: req.path,
      method: req.method,
      requestId: req.id,
      ...(config.isDevelopment && { stack: err.stack }),
    },
  });
}