import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { DashboardService } from '../../core/dashboard/dashboard.service';
import { Dashboard, TodayStatistics } from '../../models/dashboard.models';

interface StatisticCard {
  label: string;
  value: number;
  backendPending: boolean;
}

interface ServiceLink {
  label: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authenticationService = inject(AdminAuthenticationService);
  private readonly router = inject(Router);

  readonly dashboard = signal<Dashboard | null>(null);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly isLoggingOut = signal(false);
  readonly statisticCards = computed<StatisticCard[]>(() => {
    const today = this.dashboard()?.today ?? this.emptyStatistics;
    return [
      { label: 'Analytics Events', value: today.analyticsEventsToday, backendPending: false },
      { label: 'Recipe Extractions', value: today.recipeExtractionsToday, backendPending: true },
      { label: 'Barcode Lookups', value: today.barcodeLookupsToday, backendPending: true },
      { label: 'OpenAI Requests', value: today.openAiRequestsToday, backendPending: true },
    ];
  });
  readonly serviceLinks: ServiceLink[] = [
    { label: 'Analytics Events', description: 'Inspect application events', route: '/analytics/events' },
    { label: 'Recipes', description: 'Recipe operations', route: '/recipes' },
    { label: 'Barcodes', description: 'Barcode lookups', route: '/barcodes' },
    { label: 'System', description: 'Runtime information', route: '/system' },
  ];

  private readonly emptyStatistics: TodayStatistics = {
    analyticsEventsToday: 0,
    recipeExtractionsToday: 0,
    barcodeLookupsToday: 0,
    openAiRequestsToday: 0,
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  retry(): void {
    this.loadDashboard();
  }

  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    this.authenticationService
      .logout()
      .pipe(finalize(() => this.isLoggingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/login']),
        error: () => void this.router.navigate(['/login']),
      });
  }

  formatUptime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return 'Unavailable';
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}m`]
      .filter(Boolean)
      .join(' ');
  }

  private loadDashboard(): void {
    if (this.isLoading() && this.dashboard() !== null) return;
    this.hasError.set(false);
    this.isLoading.set(true);
    this.dashboardService
      .getDashboard()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (dashboard) => this.dashboard.set(dashboard),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            void this.router.navigate(['/login']);
            return;
          }
          this.hasError.set(true);
        },
      });
  }
}
