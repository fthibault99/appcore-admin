import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAnalyticsService } from '../../core/analytics/admin-analytics.service';
import { AnalyticsEventDetail } from '../../core/analytics/analytics-event.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-analytics-event-detail',
  imports: [DatePipe, RouterLink, AdminHeaderComponent],
  templateUrl: './analytics-event-detail.html',
  styleUrl: './analytics-event-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsEventDetailComponent implements OnInit {
  private readonly analyticsService = inject(AdminAnalyticsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly event = signal<AnalyticsEventDetail | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  get formattedProperties(): string {
    return JSON.stringify(this.event()?.properties ?? null, null, 2);
  }
  ngOnInit(): void {
    this.loadEvent();
  }
  retry(): void {
    this.loadEvent();
  }
  private loadEvent(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (!eventId) {
      this.hasError.set(true);
      return;
    }
    this.hasError.set(false);
    this.isLoading.set(true);
    this.analyticsService
      .getEvent(eventId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (event) => this.event.set(event),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            void this.router.navigate(['/login']);
            return;
          }
          this.hasError.set(true);
        },
      });
  }
}
