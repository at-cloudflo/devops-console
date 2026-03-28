import { Request, Response } from 'express';
import * as configService from '../services/config.service';
import { SystemConfig } from '../models/config.model';

export function getConfig(req: Request, res: Response): void {
  const config = configService.getConfig();
  res.json({ data: config });
}

export function updateConfig(req: Request, res: Response): void {
  try {
    const updates = req.body as Partial<SystemConfig>;
    const current = configService.getConfig();
    const merged: SystemConfig = {
      ...current,
      ...updates,
      alertThresholds: { ...current.alertThresholds, ...updates.alertThresholds },
      refreshIntervals: { ...current.refreshIntervals, ...updates.refreshIntervals },
      featureFlags: { ...current.featureFlags, ...updates.featureFlags },
      displayConfig: { ...current.displayConfig, ...updates.displayConfig },
      updatedBy: req.session?.user?.email ?? 'unknown',
    };
    configService.saveConfig(merged);
    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('[config] updateConfig error:', err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
}

export function resetConfig(req: Request, res: Response): void {
  try {
    const config = configService.resetToDefault();
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('[config] resetConfig error:', err);
    res.status(500).json({ error: 'Failed to reset configuration' });
  }
}
