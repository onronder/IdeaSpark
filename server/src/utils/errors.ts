export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'API_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  // Common error factories
  static badRequest(message = 'Bad request', details?: any): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized', details?: any): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED', details);
  }

  static paymentRequired(message = 'Payment required', details?: any): ApiError {
    return new ApiError(402, message, 'PAYMENT_REQUIRED', details);
  }

  static forbidden(message = 'Forbidden', details?: any): ApiError {
    return new ApiError(403, message, 'FORBIDDEN', details);
  }

  static notFound(message = 'Resource not found', details?: any): ApiError {
    return new ApiError(404, message, 'NOT_FOUND', details);
  }

  static conflict(message = 'Conflict', details?: any): ApiError {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  static tooManyRequests(message = 'Too many requests', details?: any): ApiError {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS', details);
  }

  static internalServer(message = 'Internal server error', details?: any): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR', details);
  }

  static serviceUnavailable(message = 'Service unavailable', details?: any): ApiError {
    return new ApiError(503, message, 'SERVICE_UNAVAILABLE', details);
  }
}

// Alias for backwards compatibility
export const AppError = ApiError;

// Additional error classes for specific use cases
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details?: any) {
    super(404, message, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', details?: any) {
    super(401, message, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', details?: any) {
    super(403, message, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}