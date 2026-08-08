import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAnalyticsService } from '../../core/analytics/admin-analytics.service';
import {
  AnalyticsEventFilters,
  AnalyticsEventSummary,
  PageResponse,
} from '../../core/analytics/analytics-event.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

const dateRangeValidator: ValidatorFn = (control): ValidationErrors | null => {
  const from = control.get('from')?.value as string | null;
  const to = control.get('to')?.value as string | null;
  return from && to && new Date(from) > new Date(to) ? { dateRange: true } : null;
};

@Component({
  selector: 'app-analytics-events',
  imports: [DatePipe, ReactiveFormsModule, AdminHeaderComponent],
  templateUrl: './analytics-events.html',
  styleUrl: './analytics-events.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsEventsComponent implements OnInit {
  private readonly analyticsService = inject(AdminAnalyticsService);
  private readonly router = inject(Router);
  private activeFilters: AnalyticsEventFilters = { page: 0, size: 25, sort: 'receivedAt,desc' };

  readonly eventsPage = signal<PageResponse<AnalyticsEventSummary> | null>(null);
  readonly clientNames = signal<string[]>([]);
  readonly applicationNames = signal<string[]>([]);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly filterForm = new FormGroup(
    {
      eventType: new FormControl('', { nonNullable: true }),
      clientId: new FormControl('', { nonNullable: true }),
      apiKeyName: new FormControl('', { nonNullable: true }),
      platform: new FormControl('', { nonNullable: true }),
      appVersion: new FormControl('', { nonNullable: true }),
      anonymousUserId: new FormControl('', { nonNullable: true }),
      sessionId: new FormControl('', { nonNullable: true }),
      from: new FormControl('', { nonNullable: true }),
      to: new FormControl('', { nonNullable: true }),
    },
    { validators: dateRangeValidator },
  );

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadEvents();
  }

  search(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid || this.isLoading()) return;
    const values = this.filterForm.getRawValue();
    this.activeFilters = {
      ...this.cleanTextFilters(values),
      from: this.toIso(values.from),
      to: this.toIso(values.to),
      page: 0,
      size: this.activeFilters.size,
      sort: this.activeFilters.sort,
    };
    this.loadEvents();
  }

  reset(): void {
    this.filterForm.reset();
    this.activeFilters = { page: 0, size: this.activeFilters.size, sort: 'receivedAt,desc' };
    this.loadEvents();
  }

  retry(): void {
    this.loadEvents();
  }

  previousPage(): void {
    if (!this.eventsPage()?.first) this.changePage(this.activeFilters.page - 1);
  }
  nextPage(): void {
    if (!this.eventsPage()?.last) this.changePage(this.activeFilters.page + 1);
  }

  changePageSize(event: Event): void {
    this.activeFilters = {
      ...this.activeFilters,
      page: 0,
      size: Number((event.target as HTMLSelectElement).value),
    };
    this.loadEvents();
  }

  viewEvent(eventId: string): void {
    void this.router.navigate(['/analytics/events', eventId]);
  }

  private changePage(page: number): void {
    this.activeFilters = { ...this.activeFilters, page };
    this.loadEvents();
  }

  private loadEvents(): void {
    if (this.isLoading()) return;
    this.hasError.set(false);
    this.isLoading.set(true);
    this.analyticsService
      .getEvents({ ...this.activeFilters })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => this.eventsPage.set(page),
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

  private loadFilterOptions(): void {
    this.analyticsService.getEventFilterOptions().subscribe({
      next: (options) => {
        this.clientNames.set(options.clientNames);
        this.applicationNames.set(options.applicationNames);
      },
      error: (error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          (error.status === 401 || error.status === 403)
        ) {
          void this.router.navigate(['/login']);
        }
      },
    });
  }

  private cleanTextFilters(
    values: ReturnType<typeof this.filterForm.getRawValue>,
  ): Partial<AnalyticsEventFilters> {
    return Object.fromEntries(
      Object.entries(values)
        .filter(([key]) => key !== 'from' && key !== 'to')
        .map(([key, value]) => [key, value.trim() || undefined])
        .filter((entry) => entry[1] !== undefined),
    );
  }

  private toIso(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
  }
}
