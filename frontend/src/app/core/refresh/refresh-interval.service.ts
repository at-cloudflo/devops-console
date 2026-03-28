import { Injectable, signal } from '@angular/core';

export interface IntervalOption {
  label: string;
  value: number;
}

const STORAGE_KEY = 'dc-refresh-interval';

@Injectable({ providedIn: 'root' })
export class RefreshIntervalService {
  readonly options: IntervalOption[] = [
    { label: '30 sec', value: 30_000 },
    { label: '1 min',  value: 60_000 },
    { label: '5 min',  value: 300_000 },
    { label: '15 min', value: 900_000 },
  ];

  readonly interval = signal<number>(this.loadSaved());

  set(value: number): void {
    this.interval.set(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  private loadSaved(): number {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY) ?? '', 10);
    return this.options.some(o => o.value === saved) ? saved : 60_000;
  }
}
