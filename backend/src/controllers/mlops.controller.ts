import { Request, Response } from 'express';
import * as mlopsService from '../services/mlops.service';
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
    const job = await mlopsService.getVertexJobById(req.params['id']);
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    res.json({ data: job });
  } catch (err) {
    console.error('[mlops] getVertexJobById error:', err);
    res.status(500).json({ error: 'Failed to load job details' });
  }
}
