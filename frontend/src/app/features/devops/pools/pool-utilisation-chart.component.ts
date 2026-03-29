import {
  Component,
  input,
  signal,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  effect,
} from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import {
  Chart,
  ChartConfiguration,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { DevopsApiService } from '../devops-api.service';
import { PoolUtilisationPoint } from '../../../models/devops.model';

Chart.register(TimeScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

@Component({
  selector: 'app-pool-utilisation-chart',
  standalone: true,
  template: `
    <div class="chart-wrap">
      <div class="chart-header">
        <span class="chart-title">Utilisation ({{ windowHours() }}h)</span>
        <div class="btn-group btn-group-sm">
          <button class="btn" [class.btn-primary]="windowHours()===1" [class.btn-outline-secondary]="windowHours()!==1" (click)="setWindow(1)">1h</button>
          <button class="btn" [class.btn-primary]="windowHours()===6" [class.btn-outline-secondary]="windowHours()!==6" (click)="setWindow(6)">6h</button>
          <button class="btn" [class.btn-primary]="windowHours()===24" [class.btn-outline-secondary]="windowHours()!==24" (click)="setWindow(24)">24h</button>
        </div>
      </div>
      @if (historyQuery.isPending()) {
        <div class="chart-loading">Loading…</div>
      } @else if (historyQuery.isError() || !historyQuery.data()?.data?.points?.length) {
        <div class="chart-empty">No history yet — data accumulates over time.</div>
      } @else {
        <canvas #chartCanvas style="width:100%;height:140px"></canvas>
      }
    </div>
  `,
  styles: [`
    .chart-wrap { padding: 12px 16px 8px; border-top: 1px solid var(--dc-card-border); }
    .chart-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .chart-title { font-size:12px; color:var(--dc-text-muted); font-weight:500; }
    .chart-loading, .chart-empty { font-size:12px; color:var(--dc-text-muted); text-align:center; padding:20px 0; }
  `],
})
export class PoolUtilisationChartComponent implements AfterViewInit, OnDestroy {
  readonly poolId = input.required<string>();
  readonly windowHours = signal(6);

  @ViewChild('chartCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly devopsApi = inject(DevopsApiService);
  private chart: Chart | null = null;

  readonly historyQuery = injectQuery(() => ({
    queryKey: ['devops', 'poolHistory', this.poolId(), this.windowHours()],
    queryFn: () => this.devopsApi.getPoolHistory(this.poolId(), this.windowHours()),
    staleTime: 55_000,
    refetchInterval: 60_000,
  }));

  constructor() {
    // Re-render chart whenever query data changes
    effect(() => {
      const data = this.historyQuery.data();
      if (data?.data?.points?.length) {
        // Defer so canvas is in DOM after @if block renders
        setTimeout(() => this.renderChart(data.data.points), 0);
      }
    });
  }

  setWindow(hours: number): void {
    this.windowHours.set(hours);
  }

  ngAfterViewInit(): void {
    const data = this.historyQuery.data();
    if (data?.data?.points?.length) {
      this.renderChart(data.data.points);
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(points: PoolUtilisationPoint[]): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.chart?.destroy();

    const labels = points.map((p) => new Date(p.ts));

    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Busy',
            data: points.map((p) => p.busy),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.15)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          {
            label: 'Idle',
            data: points.map((p) => p.idle),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.10)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          {
            label: 'Offline',
            data: points.map((p) => p.offline),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.10)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
          tooltip: { bodyFont: { size: 11 }, titleFont: { size: 11 } },
        },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'HH:mm', displayFormats: { minute: 'HH:mm', hour: 'HH:mm' } },
            ticks: { font: { size: 10 }, maxTicksLimit: 6 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 10 }, stepSize: 1, precision: 0 },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
        },
      },
    };

    this.chart = new Chart(canvas, cfg);
  }
}
