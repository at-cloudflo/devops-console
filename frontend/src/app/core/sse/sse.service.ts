import { Injectable, OnDestroy, inject } from '@angular/core';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { environment } from '../../../environments/environment';

/**
 * Maps backend resource keys to the TanStack Query key prefixes used in components.
 * invalidateQueries matches any query whose key *starts with* the given prefix,
 * so all filter/pagination variants are covered automatically.
 */
const RESOURCE_QUERY_KEYS: Record<string, unknown[][]> = {
  pools:      [['devops', 'pools'],     ['dashboard', 'summary']],
  agents:     [['devops', 'agents'],    ['dashboard', 'summary']],
  queue:      [['devops', 'queue'],     ['dashboard', 'summary']],
  approvals:  [['devops', 'approvals'], ['dashboard', 'summary']],
  vertexJobs: [['mlops', 'vertex'],     ['dashboard', 'summary']],
  alerts:     [['devops', 'alerts'],    ['mlops', 'alerts'], ['dashboard', 'summary']],
};

@Injectable({ providedIn: 'root' })
export class SseService implements OnDestroy {
  private readonly queryClient = injectQueryClient();
  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) return;
    this.openConnection();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private openConnection(): void {
    this.eventSource?.close();

    // EventSource sends cookies automatically when same-origin; withCredentials covers cross-origin dev proxy
    this.eventSource = new EventSource(`${environment.apiBase}/events`, { withCredentials: true });

    this.eventSource.addEventListener('resource-updated', (event: MessageEvent<string>) => {
      try {
        const { resource } = JSON.parse(event.data) as { resource: string };
        const queryKeys = RESOURCE_QUERY_KEYS[resource] ?? [];
        for (const queryKey of queryKeys) {
          void this.queryClient.invalidateQueries({ queryKey });
        }
      } catch {
        // malformed event — ignore
      }
    });

    this.eventSource.onerror = () => {
      // EventSource reconnects automatically, but if it reaches CLOSED state we help it along
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.reconnectTimer = setTimeout(() => this.openConnection(), 5_000);
      }
    };
  }
}
