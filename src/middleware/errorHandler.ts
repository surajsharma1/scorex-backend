import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  message: string;
  stack?: string;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: ErrorResponse = { ...err };
  error.message = err.message;

  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message };
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message };
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    error = { message };
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};