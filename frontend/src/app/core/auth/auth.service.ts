import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { UserProfile } from '../../models/user.model';
import { environment } from '../../../environments/environment';

interface LoginRequest { username: string; password: string; }
interface LoginResponse { success: boolean; user?: UserProfile; message?: string; }
interface MeResponse { user: UserProfile; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<UserProfile | null>(null);
  readonly isAuthenticated = signal(false);
  readonly isLoading = signal(true);

  init(): Observable<MeResponse | null> {
    return this.http
      .get<MeResponse>(`${environment.apiBase}/auth/me`, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.currentUser.set(res.user);
          this.isAuthenticated.set(true);
          this.isLoading.set(false);
        }),
        catchError(() => {
          this.isAuthenticated.set(false);
          this.isLoading.set(false);
          return of(null);
        })
      );
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBase}/auth/login`, { username, password }, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.success && res.user) {
            this.currentUser.set(res.user);
            this.isAuthenticated.set(true);
          }
        })
      );
  }

  logout(): void {
    this.http
      .post(`${environment.apiBase}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => {
          this.currentUser.set(null);
          this.isAuthenticated.set(false);
          void this.router.navigate(['/login']);
        },
      });
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.includes(role as never) ?? false;
  }

  hasAnyRole(...roles: string[]): boolean {
    const userRoles = this.currentUser()?.roles ?? [];
    return roles.some((r) => userRoles.includes(r as never));
  }
}
