import { Request, Response } from 'express';
import * as configService from '../services/config.service';
import { SystemConfig } from '../models/config.model';
import { sendTeamsAlert } from '../services/teams-webhook.service';
import { Alert } from '../models/alert.model';

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
      teamsNotifications: { ...current.teamsNotifications, ...updates.teamsNotifications },
      updatedBy: req.session?.user?.email ?? 'unknown',
    };
    configService.saveConfig(merged);
    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('[config] updateConfig error:', err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
}

export async function testTeamsWebhook(req: Request, res: Response): Promise<void> {
  const { webhookUrl } = req.body as { webhookUrl?: string };
  if (!webhookUrl) {
    res.status(400).json({ error: 'webhookUrl is required' });
    return;
  }
  const testAlert: Alert = {
    id: 'test-message',
    domain: 'devops',
    type: 'system',
    severity: 'info',
    source: 'DevOps Console',
    sourceId: 'test',
    message: 'This is a test notification from DevOps Console. Your Teams webhook is configured correctly.',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'open',
    acknowledged: false,
    metadata: {},
  };
  try {
    await sendTeamsAlert(testAlert, webhookUrl, 'new');
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook delivery failed';
    res.status(502).json({ error: message });
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
