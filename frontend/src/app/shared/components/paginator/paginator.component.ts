import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (totalPages() > 1 || total() > 10) {
      <div class="paginator">

        <!-- Info -->
        <span class="paginator-info">
          Showing {{ startItem() }}–{{ endItem() }} of {{ total() }}
        </span>

        <!-- Controls -->
        <div class="paginator-controls">
          <button class="paginator-btn" [disabled]="page() === 1" (click)="go(1)" title="First page">
            <i class="bi bi-chevron-double-left"></i>
          </button>
          <button class="paginator-btn" [disabled]="page() === 1" (click)="go(page() - 1)" title="Previous page">
            <i class="bi bi-chevron-left"></i>
          </button>

          @for (p of pageNumbers(); track p) {
            @if (p === -1) {
              <span class="paginator-ellipsis">…</span>
            } @else {
              <button
                class="paginator-btn paginator-page"
                [class.active]="p === page()"
                (click)="go(p)"
              >{{ p }}</button>
            }
          }

          <button class="paginator-btn" [disabled]="page() === totalPages()" (click)="go(page() + 1)" title="Next page">
            <i class="bi bi-chevron-right"></i>
          </button>
          <button class="paginator-btn" [disabled]="page() === totalPages()" (click)="go(totalPages())" title="Last page">
            <i class="bi bi-chevron-double-right"></i>
          </button>
        </div>

        <!-- Page size -->
        <div class="paginator-size">
          <span>Per page:</span>
          <select class="form-select form-select-sm" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
            <option [ngValue]="10">10</option>
            <option [ngValue]="25">25</option>
            <option [ngValue]="50">50</option>
            <option [ngValue]="100">100</option>
          </select>
        </div>

      </div>
    }
  `,
  styles: [`
    .paginator {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px 16px;
      border-top: 1px solid var(--dc-border-color);
      font-size: 12.5px;
      color: var(--dc-text-muted);
    }
    .paginator-info { white-space: nowrap; }
    .paginator-controls { display: flex; align-items: center; gap: 2px; margin: 0 auto; }
    .paginator-btn {
      min-width: 30px; height: 30px; padding: 0 6px;
      border: 1px solid var(--dc-border-color);
      background: var(--dc-card-bg);
      color: var(--dc-text-primary);
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: background .15s, border-color .15s;
      display: flex; align-items: center; justify-content: center;
    }
    .paginator-btn:hover:not(:disabled) {
      background: var(--dc-primary-subtle);
      border-color: var(--dc-primary);
      color: var(--dc-primary);
    }
    .paginator-btn:disabled { opacity: .4; cursor: not-allowed; }
    .paginator-btn.active {
      background: var(--dc-primary);
      border-color: var(--dc-primary);
      color: #fff;
      font-weight: 600;
    }
    .paginator-ellipsis { padding: 0 4px; color: var(--dc-text-muted); }
    .paginator-size { display: flex; align-items: center; gap: 6px; }
    .paginator-size select { width: 70px; }
  `],
})
export class PaginatorComponent {
  readonly page      = input.required<number>();
  readonly pageSize  = input.required<number>();
  readonly total     = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange     = output<number>();
  readonly pageSizeChange = output<number>();

  readonly startItem = computed(() => this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  readonly endItem   = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  readonly pageNumbers = computed(() => buildPageNumbers(this.page(), this.totalPages()));

  go(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.pageChange.emit(p);
  }

  onPageSizeChange(size: number): void {
    this.pageSizeChange.emit(Number(size));
  }
}

/** Returns an array of page numbers with -1 as ellipsis placeholder. */
function buildPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: number[] = [];
  const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  const addEllipsis = () => { if (pages[pages.length - 1] !== -1) pages.push(-1); };

  addPage(1);
  if (current > 3) addEllipsis();
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) addPage(p);
  if (current < total - 2) addEllipsis();
  addPage(total);

  return pages;
}
