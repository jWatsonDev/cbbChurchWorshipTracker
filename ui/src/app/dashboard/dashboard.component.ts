import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SongsChartsComponent } from '../songs-charts/songs-charts.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, SongsChartsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {}
