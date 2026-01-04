import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartsData, SongsService } from '../services/songs.service';

@Component({
  selector: 'app-songs-charts',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, MatProgressSpinnerModule],
  templateUrl: './songs-charts.component.html',
  styleUrl: './songs-charts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongsChartsComponent implements OnInit {
  loading = true;
  error: string | null = null;

  topPlayedData?: ChartConfiguration<'bar'>['data'];
  leastPlayedData?: ChartConfiguration<'bar'>['data'];
  daysSinceData?: ChartConfiguration<'bar'>['data'];

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    layout: {
      padding: { left: 10 }
    },
    scales: {
      x: { beginAtZero: true },
      y: {
        ticks: {
          autoSkip: false,
          font: { size: 12 }
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            if (items.length > 0) {
              return items[0].label || '';
            }
            return '';
          }
        }
      }
    }
  };

  constructor(
    private readonly songsService: SongsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.songsService.getChartsData().subscribe({
      next: (data) => {
        this.setCharts(data);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load chart data.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private setCharts(data: ChartsData): void {
    this.topPlayedData = {
      labels: data.topPlayed.map((d) => d.song),
      datasets: [{ data: data.topPlayed.map((d) => d.plays), backgroundColor: '#6366f1' }]
    };

    this.leastPlayedData = {
      labels: data.leastPlayed.map((d) => d.song),
      datasets: [{ data: data.leastPlayed.map((d) => d.plays), backgroundColor: '#f97316' }]
    };

    this.daysSinceData = {
      labels: data.daysSinceLastPlayed.map((d) => d.song),
      datasets: [
        {
          data: data.daysSinceLastPlayed.map((d) => d.daysSince),
          backgroundColor: '#ef4444'
        }
      ]
    };
  }
}
