import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideQueryClient, QueryClient } from '@tanstack/angular-query-experimental';
import { routes } from './app.routes';

// No Angular animations needed — all transitions are CSS @keyframes in styles.scss

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s before considered stale
      gcTime: 5 * 60_000,      // 5 min cache retention after component unmount
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),
    provideQueryClient(queryClient),
  ],
};
