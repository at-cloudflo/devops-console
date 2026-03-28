import { Request, Response } from 'express';
import * as authService from '../auth/auth.service';
import { LoginRequest } from '../models/user.model';

export function login(req: Request, res: Response): void {
  const { username, password } = req.body as LoginRequest;

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required.' });
    return;
  }

  const user = authService.authenticate({ username, password });
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid username or password.' });
    return;
  }

  req.session.userId = user.id;
  req.session.user = user;
  res.json({ success: true, user });
}

export function logout(req: Request, res: Response): void {
  req.session.destroy(() => {
    res.json({ success: true });
  });
}

export function me(req: Request, res: Response): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: req.session.user });
}
