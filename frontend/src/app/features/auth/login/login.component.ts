import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { MenuService } from '../../../core/menu/menu.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card card shadow-lg">
        <div class="login-header">
          <div class="login-logo">
            <i class="bi bi-terminal-fill"></i>
          </div>
          <h2>DevOps Console</h2>
          <p>Internal Developer Portal</p>
        </div>

        <div class="login-body">
          @if (error()) {
            <div class="alert alert-danger py-2 mb-3" style="font-size:13px;">
              <i class="bi bi-exclamation-triangle me-2"></i>{{ error() }}
            </div>
          }

          <form (ngSubmit)="onLogin()">
            <div class="mb-3">
              <label class="form-label" style="font-size:13px;font-weight:500;">Username</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="username"
                name="username"
                placeholder="Enter username"
                autocomplete="username"
                [disabled]="loading()"
                required
              />
            </div>

            <div class="mb-4">
              <label class="form-label" style="font-size:13px;font-weight:500;">Password</label>
              <input
                type="password"
                class="form-control"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter password"
                autocomplete="current-password"
                [disabled]="loading()"
                required
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100"
              [disabled]="loading() || !username || !password"
            >
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Signing in...
              } @else {
                <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
              }
            </button>
          </form>

          <!-- Demo accounts hint -->
          <div class="mt-4 p-3 rounded" style="background:var(--dc-page-bg);font-size:11.5px;">
            <div class="fw-600 mb-2" style="color:var(--dc-text-secondary)">
              <i class="bi bi-info-circle me-1"></i>POC Demo Accounts
            </div>
            <div class="d-flex flex-column gap-1">
              @for (account of demoAccounts; track account.user) {
                <div class="d-flex justify-content-between align-items-center">
                  <button
                    class="btn btn-link btn-sm p-0 text-start"
                    style="font-size:11.5px;color:var(--dc-primary)"
                    (click)="fillCredentials(account.user, account.pass)"
                    type="button"
                  >
                    {{ account.user }} / {{ account.pass }}
                  </button>
                  <span class="badge bg-secondary" style="font-size:10px">{{ account.role }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal('');

  readonly demoAccounts = [
    { user: 'admin', pass: 'admin123', role: 'Full Access' },
    { user: 'devops', pass: 'devops123', role: 'DevOps' },
    { user: 'mlops', pass: 'mlops123', role: 'MLOps' },
    { user: 'readonly', pass: 'readonly123', role: 'Read Only' },
  ];

  fillCredentials(user: string, pass: string): void {
    this.username = user;
    this.password = pass;
  }

  onLogin(): void {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        if (res.success) {
          this.menuService.loadMenu().subscribe(() => {
            void this.router.navigate(['/dashboard']);
          });
        } else {
          this.error.set(res.message ?? 'Login failed');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Login failed. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
