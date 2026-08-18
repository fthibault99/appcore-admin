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

const analyticsEventsStateKey = 'appcore-admin.analytics-events.state';
const analyticsEventsSavedFiltersKey = 'appcore-admin.analytics-events.saved-filters';

interface AnalyticsEventsFormValue {
  eventType: string;
  clientId: string;
  apiKeyName: string;
  platform: string;
  appVersion: string;
  anonymousUserId: string;
  sessionId: string;
  from: string;
  to: string;
}

interface AnalyticsEventsSessionState {
  filters: AnalyticsEventFilters;
  form: AnalyticsEventsFormValue;
}

interface SavedAnalyticsFilter {
  name: string;
  form: AnalyticsEventsFormValue;
}

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
  readonly savedFilters = signal<SavedAnalyticsFilter[]>([]);
  readonly selectedSavedFilter = signal('');
  readonly savedFilterName = new FormControl('', { nonNullable: true });
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
    this.restoreSavedFilters();
    this.restoreState();
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
    this.persistState();
    this.loadEvents();
  }

  reset(): void {
    this.filterForm.reset();
    this.activeFilters = { page: 0, size: this.activeFilters.size, sort: 'receivedAt,desc' };
    this.persistState();
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
    this.persistState();
    this.loadEvents();
  }

  viewEvent(eventId: string): void {
    void this.router.navigate(['/analytics/events', eventId]);
  }

  saveCurrentFilter(): void {
    const name = this.savedFilterName.value.trim();
    if (!name) return;
    const savedFilter: SavedAnalyticsFilter = { name, form: this.filterForm.getRawValue() };
    const filters = this.savedFilters().filter((filter) => filter.name !== name);
    this.savedFilters.set([...filters, savedFilter].sort((left, right) => left.name.localeCompare(right.name)));
    this.selectedSavedFilter.set(name);
    this.savedFilterName.setValue('');
    this.persistSavedFilters();
  }

  selectSavedFilter(event: Event): void {
    this.selectedSavedFilter.set((event.target as HTMLSelectElement).value);
  }

  applySavedFilter(): void {
    const savedFilter = this.savedFilters().find(
      (filter) => filter.name === this.selectedSavedFilter(),
    );
    if (!savedFilter || this.isLoading()) return;
    this.filterForm.setValue(savedFilter.form);
    this.search();
  }

  deleteSavedFilter(): void {
    const name = this.selectedSavedFilter();
    if (!name) return;
    this.savedFilters.update((filters) => filters.filter((filter) => filter.name !== name));
    this.selectedSavedFilter.set('');
    this.persistSavedFilters();
  }

  private changePage(page: number): void {
    this.activeFilters = { ...this.activeFilters, page };
    this.persistState();
    this.loadEvents();
  }

  private restoreState(): void {
    try {
      const storedState = sessionStorage.getItem(analyticsEventsStateKey);
      if (!storedState) return;
      const state = JSON.parse(storedState) as Partial<AnalyticsEventsSessionState>;
      if (!state.filters || !state.form) return;
      if (
        typeof state.filters.page !== 'number' ||
        typeof state.filters.size !== 'number' ||
        typeof state.filters.sort !== 'string' ||
        Object.values(state.form).some((value) => typeof value !== 'string')
      ) {
        return;
      }
      this.activeFilters = state.filters;
      this.filterForm.patchValue(state.form);
    } catch {
      sessionStorage.removeItem(analyticsEventsStateKey);
    }
  }

  private persistState(): void {
    const state: AnalyticsEventsSessionState = {
      filters: this.activeFilters,
      form: this.filterForm.getRawValue(),
    };
    try {
      sessionStorage.setItem(analyticsEventsStateKey, JSON.stringify(state));
    } catch {
      // Keep the page usable when browser storage is unavailable.
    }
  }

  private restoreSavedFilters(): void {
    try {
      const storedFilters = window.localStorage.getItem(analyticsEventsSavedFiltersKey);
      if (!storedFilters) return;
      const filters = JSON.parse(storedFilters) as SavedAnalyticsFilter[];
      if (!Array.isArray(filters) || filters.some((filter) => !this.isValidSavedFilter(filter))) {
        window.localStorage.removeItem(analyticsEventsSavedFiltersKey);
        return;
      }
      this.savedFilters.set(filters);
    } catch {
      window.localStorage.removeItem(analyticsEventsSavedFiltersKey);
    }
  }

  private persistSavedFilters(): void {
    try {
      window.localStorage.setItem(
        analyticsEventsSavedFiltersKey,
        JSON.stringify(this.savedFilters()),
      );
    } catch {
      // Keep the page usable when browser storage is unavailable.
    }
  }

  private isValidSavedFilter(filter: SavedAnalyticsFilter): boolean {
    return (
      typeof filter?.name === 'string' &&
      filter.name.trim().length > 0 &&
      filter.form !== null &&
      typeof filter.form === 'object' &&
      Object.values(filter.form).length === 9 &&
      Object.values(filter.form).every((value) => typeof value === 'string')
    );
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
