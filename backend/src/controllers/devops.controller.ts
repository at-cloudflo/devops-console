import { Request, Response } from 'express';
import * as devopsService from '../services/devops.service';

export async function getPools(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query.refresh === 'true';
    const pools = await devopsService.getPools(force);
    res.json({ data: pools, total: pools.length });
  } catch (err) {
    console.error('[devops] getPools error:', err);
    res.status(500).json({ error: 'Failed to load pools' });
  }
}

export async function getPoolById(req: Request, res: Response): Promise<void> {
  try {
    const pools = await devopsService.getPools();
    const pool = pools.find((p) => p.id === req.params.id);
    if (!pool) {
      res.status(404).json({ error: 'Pool not found' });
      return;
    }
    res.json({ data: pool });
  } catch (err) {
    console.error('[devops] getPoolById error:', err);
    res.status(500).json({ error: 'Failed to load pool' });
  }
}

export async function getAgents(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query.refresh === 'true';
    const poolId = req.query.poolId as string | undefined;
    const agents = await devopsService.getAgents(poolId, force);
    res.json({ data: agents, total: agents.length });
  } catch (err) {
    console.error('[devops] getAgents error:', err);
    res.status(500).json({ error: 'Failed to load agents' });
  }
}

export async function getAgentsByPool(req: Request, res: Response): Promise<void> {
  try {
    const agents = await devopsService.getAgents(req.params.id);
    res.json({ data: agents, total: agents.length });
  } catch (err) {
    console.error('[devops] getAgentsByPool error:', err);
    res.status(500).json({ error: 'Failed to load agents for pool' });
  }
}

export async function getQueue(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query.refresh === 'true';
    const sinceHours = req.query.sinceHours ? Number(req.query.sinceHours) : 6;
    const project = req.query.project as string | undefined;
    const pool = req.query.pool as string | undefined;
    const since = new Date(Date.now() - sinceHours * 3600 * 1000);
    const jobs = await devopsService.getQueueJobs(since, project, pool, force);
    res.json({ data: jobs, total: jobs.length });
  } catch (err) {
    console.error('[devops] getQueue error:', err);
    res.status(500).json({ error: 'Failed to load queue' });
  }
}

export async function getApprovals(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query.refresh === 'true';
    const project = req.query.project as string | undefined;
    const approvals = await devopsService.getApprovals(project, force);
    res.json({ data: approvals, total: approvals.length });
  } catch (err) {
    console.error('[devops] getApprovals error:', err);
    res.status(500).json({ error: 'Failed to load approvals' });
  }
}

export async function getAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { alertService } = await import('../services/alert.service');
    const status = req.query.status as string | undefined;
    const alerts = (await import('../services/alert.service')).getAlerts(
      status as 'open' | 'acknowledged' | 'resolved' | undefined
    );
    res.json({ data: alerts, total: alerts.length });
  } catch (err) {
    console.error('[devops] getAlerts error:', err);
    res.status(500).json({ error: 'Failed to load alerts' });
  }
}

export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.session?.user?.email ?? 'unknown';
    const alert = (await import('../services/alert.service')).acknowledgeAlert(req.params.id, userId);
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ data: alert });
  } catch (err) {
    console.error('[devops] acknowledgeAlert error:', err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
}
