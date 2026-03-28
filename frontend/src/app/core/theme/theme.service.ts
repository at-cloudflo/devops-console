import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'dc-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.loadStoredTheme());

  constructor() {
    // React to theme changes by updating the DOM
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  private loadStoredTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  }
}
