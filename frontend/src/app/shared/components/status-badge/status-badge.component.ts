import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge-status" [class]="badgeClass()">
      <span class="status-dot"></span>
      {{ displayLabel() }}
    </span>
  `
})
export class StatusBadgeComponent {
  status = input.required<string>();
  label = input<string>();

  displayLabel(): string {
    return this.label() ?? this.humanize(this.status());
  }

  badgeClass(): string {
    const s = this.status().toLowerCase().replace(/pipeline_state_/i, '');
    const map: Record<string, string> = {
      online: 'status-online',
      healthy: 'status-healthy',
      succeeded: 'status-succeeded',
      completed: 'status-succeeded',
      warning: 'status-warning',
      critical: 'status-critical',
      failed: 'status-failed',
      offline: 'status-offline',
      running: 'status-running',
      busy: 'status-busy',
      queued: 'status-queued',
      pending: 'status-pending',
      disabled: 'status-disabled',
      paused: 'status-queued',
      cancelling: 'status-warning',
      cancelled: 'status-disabled',
    };
    return `badge-status ${map[s] ?? 'status-secondary'}`;
  }

  private humanize(s: string): string {
    return s
      .replace(/pipeline_state_/i, '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
