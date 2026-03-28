import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="d-flex align-items-center justify-content-center p-4" [style.min-height]="minHeight()">
      <div class="spinner-border text-primary-brand" role="status" style="width:2rem;height:2rem;border-width:2px;">
        <span class="visually-hidden">Loading...</span>
      </div>
      @if (message()) {
        <span class="ms-3 text-muted" style="font-size:13px;">{{ message() }}</span>
      }
    </div>
  `
})
export class LoadingSpinnerComponent {
  message = input<string>();
  minHeight = input('120px');
}
