import { Request, Response } from 'express';
import { addSseClient } from '../services/sse.service';

export function subscribe(req: Request, res: Response): void {
  addSseClient(res);
}
