import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Please log in to continue.' });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userRoles: string[] = req.session.user.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions.' });
      return;
    }
    next();
  };
}
