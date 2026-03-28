import { Request, Response } from 'express';
import * as refreshService from '../services/refresh.service';

export function getHealth(req: Request, res: Response): void {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0-poc',
    uptime: process.uptime(),
  });
}

export function getRefreshStatus(req: Request, res: Response): void {
  const status = refreshService.getRefreshStatus();
  res.json({ data: status });
}

export async function triggerRefresh(req: Request, res: Response): Promise<void> {
  try {
    await refreshService.triggerManualRefresh();
    const status = refreshService.getRefreshStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[system] triggerRefresh error:', err);
    res.status(500).json({ error: 'Refresh failed' });
  }
}
