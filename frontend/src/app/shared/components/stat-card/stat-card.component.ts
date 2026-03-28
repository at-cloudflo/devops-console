import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatCardColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card stat-card h-100">
      <div class="card-body">
        <div class="d-flex align-items-start justify-content-between">
          <div class="flex-grow-1 min-w-0">
            <div class="stat-label">{{ label() }}</div>
            <div class="stat-value mt-1">
              @if (loading()) {
                <span class="skeleton skeleton-text" style="width:60px;display:inline-block"></span>
              } @else {
                {{ value() }}
              }
            </div>
            @if (subtext()) {
              <div class="stat-delta text-muted">
                {{ subtext() }}
              </div>
            }
          </div>
          <div class="stat-icon ms-3" [ngClass]="iconBgClass()">
            <i class="bi" [ngClass]="icon()"></i>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StatCardComponent {
  label = input.required<string>();
  value = input<string | number>('—');
  icon = input.required<string>();
  color = input<StatCardColor>('primary');
  subtext = input<string>();
  loading = input(false);

  iconBgClass(): string {
    const map: Record<StatCardColor, string> = {
      primary: 'text-primary-brand',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
      info: 'text-info',
      secondary: 'text-secondary',
    };
    const bg: Record<StatCardColor, string> = {
      primary: 'bg-primary-subtle',
      success: 'bg-success-subtle',
      warning: 'bg-warning-subtle',
      danger: 'bg-danger-subtle',
      info: 'bg-info-subtle',
      secondary: 'bg-secondary-subtle',
    };
    return `${bg[this.color()]} ${map[this.color()]}`;
  }
}
