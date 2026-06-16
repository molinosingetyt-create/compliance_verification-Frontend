import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
} from 'chart.js';
import type { MachineDeviationChartData } from './dashboard-metrics.util';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler
);

@Component({
  selector: 'app-dashboard-machine-deviation-chart',
  standalone: true,
  template: `
    <div class="deviation-chart" role="img" [attr.aria-label]="ariaLabel()">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [
    `
      .deviation-chart {
        position: relative;
        width: 100%;
        height: min(360px, 50vh);
        min-height: 260px;
      }
    `,
  ],
})
export class DashboardMachineDeviationChartComponent implements AfterViewInit, OnDestroy {
  readonly chartData = input.required<MachineDeviationChartData>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart<'line'> | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const data = this.chartData();
      if (this.viewReady) {
        this.renderChart(data);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart(this.chartData());
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  ariaLabel(): string {
    const n = this.chartData().series.length;
    return `Gráfica lineal de desviación estándar por día para ${n} máquina(s)`;
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private renderChart(data: MachineDeviationChartData): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    this.destroyChart();

    if (!data.hasData) {
      return;
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: data.series.map((s) => ({
          label: s.machineLabel,
          data: s.values,
          borderColor: s.color,
          backgroundColor: s.color,
          pointBackgroundColor: s.color,
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 14,
              font: { size: 11, family: "'D-DIN Condensed', Arial, sans-serif" },
            },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const iso = data.daysIso[idx];
                return iso ? `Día ${iso}` : items[0]?.label ?? '';
              },
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null || Number.isNaN(v)) {
                  return `${ctx.dataset.label}: sin dato`;
                }
                return `${ctx.dataset.label}: ${v.toFixed(4)} g`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Día',
              font: { size: 12, weight: 'bold' },
            },
            grid: { color: 'rgba(16, 56, 71, 0.08)' },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Desviación estándar (g)',
              font: { size: 12, weight: 'bold' },
            },
            grid: { color: 'rgba(16, 56, 71, 0.08)' },
          },
        },
      },
    });
  }
}
