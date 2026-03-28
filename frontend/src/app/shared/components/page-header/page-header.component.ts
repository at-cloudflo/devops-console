import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div class="page-header-content">
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header-actions">
        @if (showRefresh()) {
          <button
            class="btn btn-sm btn-outline-secondary"
            [class.disabled]="refreshing()"
            (click)="onRefresh.emit()"
            [attr.title]="lastRefresh() ? 'Last refresh: ' + lastRefresh() : 'Refresh'"
          >
            <i class="bi bi-arrow-clockwise" [class.spinning]="refreshing()"></i>
            {{ refreshing() ? 'Refreshing...' : 'Refresh' }}
          </button>
        }
        <ng-content></ng-content>
      </div>
    </div>
    @if (lastRefresh()) {
      <p class="text-muted" style="font-size:11.5px; margin: -12px 0 16px;">
        <i class="bi bi-clock me-1"></i>Last refreshed: {{ lastRefresh() }}
      </p>
    }
  `,
  styles: [`
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
  showRefresh = input(false);
  refreshing = input(false);
  lastRefresh = input<string | null>(null);
  onRefresh = output<void>();
}
