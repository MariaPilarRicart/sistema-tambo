import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  const isKnownError = error instanceof AppError;
  const statusCode = isKnownError ? error.statusCode : 500;
  const message = isKnownError ? error.message : 'Internal server error';

  if (env.nodeEnv !== 'test') {
    console.error(error);
  }

  response.status(statusCode).json({
    status: 'error',
    message,
  });
};
