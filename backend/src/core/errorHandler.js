import { AppError } from './AppError.js';
import { ApiResponse } from './ApiResponse.js';
import { logger } from '../config/logger.js';
import { ZodError } from 'zod';

/**
 * Express global error handling middleware.
 */
export const globalErrorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    logger.warn({
      msg: err.message,
      path: req.originalUrl,
      ruleViolated: err.ruleViolated,
      details: err.details,
    });
    return res
      .status(err.statusCode)
      .json(ApiResponse.fail(err.message, err.errorCode, err.ruleViolated, err.details));
  }

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const message = `Invalid input on '${issue.path.join('.')}': ${issue.message}`;
    logger.warn({ msg: message, issues: err.issues });
    return res
      .status(400)
      .json(ApiResponse.fail(message, 'VALIDATION_ERROR', 'R1', { issues: err.issues }));
  }

  logger.error({ err, path: req.originalUrl }, 'Unhandled Server Error');
  return res
    .status(500)
    .json(ApiResponse.fail(err.message || 'Internal server error', 'INTERNAL_ERROR'));
};

