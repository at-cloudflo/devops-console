import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  // Public
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // Protected shell
  {
    path: '',
    loadComponent: () =>
      import('./layout/layout.component').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // DevOps module
      {
        path: 'devops',
        children: [
          { path: '', redirectTo: 'pools', pathMatch: 'full' },
          {
            path: 'pools',
            loadComponent: () =>
              import('./features/devops/pools/pools.component').then((m) => m.PoolsComponent),
            canActivate: [roleGuard('devops.read', 'portal.admin')],
          },
          {
            path: 'agents',
            loadComponent: () =>
              import('./features/devops/agents/agents.component').then((m) => m.AgentsComponent),
            canActivate: [roleGuard('devops.read', 'portal.admin')],
          },
          {
            path: 'queue',
            loadComponent: () =>
              import('./features/devops/queue/queue.component').then((m) => m.QueueComponent),
            canActivate: [roleGuard('devops.read', 'portal.admin')],
          },
          {
            path: 'approvals',
            loadComponent: () =>
              import('./features/devops/approvals/approvals.component').then((m) => m.ApprovalsComponent),
            canActivate: [roleGuard('devops.approval.read', 'devops.read', 'portal.admin')],
          },
          {
            path: 'alerts',
            loadComponent: () =>
              import('./features/devops/alerts/alerts.component').then((m) => m.AlertsComponent),
            canActivate: [roleGuard('devops.read', 'portal.admin')],
          },
        ],
      },

      // MLOps module
      {
        path: 'mlops',
        children: [
          { path: '', redirectTo: 'vertex-jobs', pathMatch: 'full' },
          {
            path: 'vertex-jobs',
            loadComponent: () =>
              import('./features/mlops/vertex-jobs/vertex-jobs.component').then((m) => m.VertexJobsComponent),
            canActivate: [roleGuard('mlops.read', 'portal.admin')],
          },
        ],
      },

      // Config module
      {
        path: 'config',
        loadComponent: () =>
          import('./features/config/config.component').then((m) => m.ConfigComponent),
        canActivate: [roleGuard('config.admin', 'portal.admin')],
      },

      // About
      {
        path: 'about',
        loadComponent: () =>
          import('./features/about/about.component').then((m) => m.AboutComponent),
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];
