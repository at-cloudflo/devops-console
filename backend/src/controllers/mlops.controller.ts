import { Request, Response } from 'express';
import * as mlopsService from '../services/mlops.service';
import { getAlerts, acknowledgeAlert } from '../services/alert.service';
import { VertexJobsFilter } from '../models/mlops.model';
import { parsePagination, paginate } from '../utils/paginate';

export async function getVertexJobs(req: Request, res: Response): Promise<void> {
  try {
    const force = req.query['refresh'] === 'true';
    const filter: VertexJobsFilter = {
      projectId: req.query['projectId'] as string | undefined,
      region:    req.query['region']    as string | undefined,
      state:     req.query['state']     as VertexJobsFilter['state'],
      startAfter:  req.query['startAfter']  as string | undefined,
      startBefore: req.query['startBefore'] as string | undefined,
      search:    req.query['search']    as string | undefined,
    };

    const [jobs, summary] = await Promise.all([
      mlopsService.getVertexJobs(filter, force),
      mlopsService.getVertexJobsSummary(),
    ]);

    const paged = paginate(jobs, parsePagination(req.query));
    res.json({ ...paged, summary });
  } catch (err) {
    console.error('[mlops] getVertexJobs error:', err);
    res.status(500).json({ error: 'Failed to load Vertex jobs' });
  }
}

export async function getVertexJobById(req: Request, res: Response): Promise<void> {
  try {
    const job = await mlopsService.getVertexJobById(req.params['id'] as string);
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    res.json({ data: job });
  } catch (err) {
    console.error('[mlops] getVertexJobById error:', err);
    res.status(500).json({ error: 'Failed to load job details' });
  }
}

export function getMlopsAlerts(req: Request, res: Response): void {
  try {
    const status = req.query['status'] as 'open' | 'acknowledged' | 'resolved' | undefined;
    const severity = req.query['severity'] as string | undefined;
    const search = (req.query['search'] as string | undefined)?.toLowerCase();

    let alerts = getAlerts(status, 'mlops');
    if (severity) alerts = alerts.filter((a) => a.severity === severity);
    if (search) alerts = alerts.filter((a) =>
      a.message.toLowerCase().includes(search) ||
      a.source.toLowerCase().includes(search) ||
      a.type.toLowerCase().includes(search)
    );

    res.json(paginate(alerts, parsePagination(req.query)));
  } catch (err) {
    console.error('[mlops] getAlerts error:', err);
    res.status(500).json({ error: 'Failed to load alerts' });
  }
}

export function acknowledgeMlopsAlert(req: Request, res: Response): void {
  try {
    const userId = req.session?.user?.email ?? 'unknown';
    const alert = acknowledgeAlert(req.params['id'] as string, userId);
    if (!alert) { res.status(404).json({ error: 'Alert not found' }); return; }
    res.json({ data: alert });
  } catch (err) {
    console.error('[mlops] acknowledgeAlert error:', err);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
}
