import { Response } from 'express';

const clients = new Set<Response>();

export function addSseClient(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  clients.add(res);

  // Keep-alive ping every 25s to prevent proxy/load-balancer timeouts
  const keepAlive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch { /* client gone */ }
  }, 25_000);

  res.on('close', () => {
    clients.delete(res);
    clearInterval(keepAlive);
  });
}

export function broadcast(resource: string): void {
  if (clients.size === 0) return;
  const payload =
    `event: resource-updated\ndata: ${JSON.stringify({ resource, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
