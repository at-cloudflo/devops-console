import { Request, Response, NextFunction } from 'express';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found.`,
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error('[error]', err.message, err.stack);
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.name,
    message: process.env.NODE_ENV === 'production' ? 'An error occurred.' : err.message,
  });
}
