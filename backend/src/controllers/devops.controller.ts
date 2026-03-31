import { Request, Response } from 'express';
import * as devopsService from '../services/devops.service';
import { parsePagination, paginate } from '../utils/paginate';

export async function getPools(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query['refresh'] === 'true';
    const search = (req.query['search'] as string | undefined)?.toLowerCase();
    const alertState = req.query['alertState'] as string | undefined;

    let pools = await devopsService.getPools(force);
    if (search) pools = pools.filter((p) => p.name.toLowerCase().includes(search));
    if (alertState) pools = pools.filter((p) => p.alertState === alertState);

    res.json(paginate(pools, parsePagination(req.query)));
  } catch (err) {
    console.error('[devops] getPools error:', err);
    res.status(500).json({ error: 'Failed to load pools' });
  }
}

export async function getPoolById(req: Request, res: Response): Promise<void> {
  try {
    const pools = await devopsService.getPools();
    const pool = pools.find((p) => p.id === req.params['id']);
    if (!pool) { res.status(404).json({ error: 'Pool not found' }); return; }
    res.json({ data: pool });
  } catch (err) {
    console.error('[devops] getPoolById error:', err);
    res.status(500).json({ error: 'Failed to load pool' });
  }
}

export async function getAgents(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query['refresh'] === 'true';
    const poolId = req.query['poolId'] as string | undefined;
    const search = (req.query['search'] as string | undefined)?.toLowerCase();
    const status = req.query['status'] as string | undefined;
    const pool = req.query['pool'] as string | undefined;

    let agents = await devopsService.getAgents(poolId, force);
    if (search) agents = agents.filter((a) =>
      a.name.toLowerCase().includes(search) || a.poolName.toLowerCase().includes(search)
    );
    if (status) agents = agents.filter((a) => a.status === status);
    if (pool) agents = agents.filter((a) => a.poolName === pool);

    res.json(paginate(agents, parsePagination(req.query)));
  } catch (err) {
    console.error('[devops] getAgents error:', err);
    res.status(500).json({ error: 'Failed to load agents' });
  }
}

export async function getAgentsByPool(req: Request, res: Response): Promise<void> {
  try {
    const agents = await devopsService.getAgents(req.params['id']);
    res.json(paginate(agents, parsePagination(req.query)));
  } catch (err) {
    console.error('[devops] getAgentsByPool error:', err);
    res.status(500).json({ error: 'Failed to load agents for pool' });
  }
}

export async function getQueue(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query['refresh'] === 'true';
    const sinceHours = req.query['sinceHours'] ? Number(req.query['sinceHours']) : 6;
    const project = req.query['project'] as string | undefined;
    const pool = req.query['pool'] as string | undefined;
    const search = (req.query['search'] as string | undefined)?.toLowerCase();
    const status = req.query['status'] as string | undefined;

    let jobs = await devopsService.getQueueJobs(
      new Date(Date.now() - sinceHours * 3600 * 1000),
      project,
      pool,
      force,
    );
    if (search) jobs = jobs.filter((j) =>
      j.pipelineName.toLowerCase().includes(search) || j.project.toLowerCase().includes(search)
    );
    if (status) jobs = jobs.filter((j) => j.status === status);

    res.json(paginate(jobs, parsePagination(req.query)));
  } catch (err) {
    console.error('[devops] getQueue error:', err);
    res.status(500).json({ error: 'Failed to load queue' });
  }
}

export async function getApprovals(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query['refresh'] === 'true';
    const project = req.query['project'] as string | undefined;
    const search = (req.query['search'] as string | undefined)?.toLowerCase();

    let approvals = await devopsService.getApprovals(project, force);
    approvals = approvals.filter((a) => a.status === 'pending');
    if (search) approvals = approvals.filter((a) =>
      a.pipelineName.toLowerCase().includes(search) || a.project.toLowerCase().includes(search)
    );

    res.json(paginate(approvals, parsePagination(req.query)));
  } catch (err) {
    console.error('[devops] getApprovals error:', err);
    res.status(500).json({ error: 'Failed to load approvals' });
  }
}

export async function getAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { getAlerts: fetchAlerts } = await import('../services/alert.service');
    const status = req.query['status'] as 'open' | 'acknowledged' | 'resolved' | undefined;
    const severity = req.query['severity'] as string | undefined;
    const search = (req.query['search'] as string | undefined)?.toLowerCase();

    let alerts = fetchAlerts(status);
    if (severity) alerts = alerts.filter((a) => a.severity === severity);
    if (search) alerts = alerts.filter((a) =>
      a.message.toLowerCase().includes(search) ||
      a.source.toLowerCase().includes(search) ||
      a.type.toLowerCase().includes(search)
    );

    res.json(paginate(alerts, parsePagination(req.query)));
  } catch (err) {
    console.error('[devops] getAlerts error:', err);
    res.status(500).json({ error: 'Failed to load alerts' });
  }
}

export async function getProjectAdmins(req: Request, res: Response): Promise<void> {
  try {
    const projectKey = req.params['projectKey'] as string | undefined;
    const admins = await devopsService.getProjectAdmins(projectKey);
    res.json({ data: admins });
  } catch (err) {
    console.error('[devops] getProjectAdmins error:', err);
    res.status(500).json({ error: 'Failed to load project admins' });
  }
}

export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.session?.user?.email ?? 'unknown';
    const { acknowledgeAlert: ack } = await import('../services/alert.service');
    const alert = ack(req.params['id'], userId);
    if (!alert) { res.status(404).json({ error: 'Alert not found' }); return; }
    res.json({ data: alert });
  } catch (err) {
    console.error('[devops] acknowledgeAlert error:', err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
}
