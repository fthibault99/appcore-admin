import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AppStoreRatings, AppStoreRatingsComparison } from '../../core/app-store/app-store-ratings.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

type CountrySort = 'ratings' | 'average' | 'country';
type CountryChangeFilter = 'all' | 'count' | 'average' | 'any';

@Component({
  selector: 'app-store-ratings',
  imports: [DatePipe, DecimalPipe, RouterLink, AdminHeaderComponent],
  templateUrl: './app-store-ratings.html',
  styleUrl: './app-store-ratings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStoreRatingsComponent implements OnInit {
  private readonly service = inject(AdminAppStoreService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  private comparisonRequest?: Subscription;
  readonly comparison = signal<AppStoreRatingsComparison | null>(null);
  readonly comparisonLoading = signal(false);
  readonly comparisonError = signal<string | null>(null);
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly customComparison = signal(false);
  readonly validDates = computed(() => {
    const dates = this.comparison()?.availableDates ?? [];
    return dates.includes(this.fromDate()) && dates.includes(this.toDate()) && this.fromDate() < this.toDate();
  });
  readonly applications = signal<AppStoreRatings[]>([]);
  readonly selectedId = signal('');
  readonly isLoading = signal(false);
  readonly isRequestingCollection = signal(false);
  readonly collectionMessage = signal<string | null>(null);
  readonly collectionError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly sort = signal<CountrySort>('ratings');
  readonly changeFilter = signal<CountryChangeFilter>('all');
  readonly totalRatingsChange = computed(() => {
    const rows = this.comparison()?.countries;
    if (!rows?.length || rows.some(row => row.ratingCountChange === null)) return null;
    return rows.reduce((total, row) => total + row.ratingCountChange!, 0);
  });
  readonly selected = computed(() => this.applications().find(app => app.applicationId === this.selectedId()));
  readonly countries = computed(() => {
    const comparison = this.comparison();
    const filter = this.changeFilter();
    const comparisonRows = comparison?.countries.filter(row => {
      const countChanged = row.ratingCountChange !== null && row.ratingCountChange !== 0;
      const averageChanged = row.averageRatingChange !== null && row.averageRatingChange !== 0;
      return filter === 'all' || (filter === 'count' && countChanged)
        || (filter === 'average' && averageChanged) || (filter === 'any' && (countChanged || averageChanged));
    });
    const rows = comparisonRows ? comparisonRows.map(row => ({
      country: row.country,
      ratingCount: row.after?.ratingCount ?? null,
      averageRating: row.after?.averageRating ?? null,
      collectedDate: row.after?.collectedDate ?? null,
      collectedAt: row.after?.collectedAt ?? null,
    })) : [...(this.selected()?.countries ?? [])];
    return rows.sort((a, b) => {
      const difference = this.sort() === 'country'
        ? this.countryName(a.country).localeCompare(this.countryName(b.country))
        : this.sort() === 'average'
          ? (b.averageRating ?? -1) - (a.averageRating ?? -1)
          : (b.ratingCount ?? -1) - (a.ratingCount ?? -1);
      return difference || a.country.localeCompare(b.country);
    });
  });

  ngOnInit(): void { this.load(); }

  selectApplication(event: Event): void {
    this.selectedId.set((event.target as HTMLSelectElement).value);
    this.collectionMessage.set(null);
    this.collectionError.set(null);
    this.loadComparison();
  }

  changeDate(which: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    (which === 'from' ? this.fromDate : this.toDate).set(value);
  }

  compareDates(): void {
    if (this.validDates()) this.loadComparison(this.fromDate(), this.toDate());
  }

  dailyComparison(): void { this.loadComparison(); }

  changeFor(code: string) {
    return this.comparison()?.countries.find(row => row.country === code);
  }

  loadComparison(from?: string, to?: string): void {
    this.comparisonRequest?.unsubscribe();
    this.comparison.set(null);
    this.comparisonError.set(null);
    this.customComparison.set(!!from);
    if (!this.selectedId()) return;
    this.comparisonLoading.set(true);
    this.comparisonRequest = this.service.compareRatings(this.selectedId(), from, to).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.comparisonLoading.set(false)),
    ).subscribe({
      next: value => {
        this.comparison.set(value);
        this.fromDate.set(value.availableDates.includes(value.from ?? '') ? value.from! : '');
        this.toDate.set(value.to ?? '');
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']);
        } else this.comparisonError.set(error instanceof HttpErrorResponse && error.status === 404
          ? 'Comparison is unavailable on the server (HTTP 404). Check that AppCore has been updated and the application still exists, then reload saved ratings.'
          : 'Unable to load comparison. Reload to try again.');
      },
    });
  }

  selectChangeFilter(event: Event): void {
    this.changeFilter.set((event.target as HTMLSelectElement).value as CountryChangeFilter);
  }

  selectSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as CountrySort);
  }

  countryName(code: string): string { return this.regionNames.of(code) ?? code; }

  flag(code: string): string {
    return /^[A-Z]{2}$/.test(code)
      ? String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0)))
      : '';
  }

  ratingTone(average: number | null): string {
    return average === null ? '' : average >= 4 ? 'positive' : average >= 3.5 ? 'moderate' : 'negative';
  }

  collectRatings(): void {
    const app = this.selected();
    if (!app || this.isRequestingCollection() || this.isLoading()) return;
    this.isRequestingCollection.set(true);
    this.collectionMessage.set(null);
    this.collectionError.set(null);
    this.service.refreshRatings(app.applicationId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isRequestingCollection.set(false)),
    ).subscribe({
      next: () => this.collectionMessage.set(
        `Collection request accepted for ${app.applicationName}. It runs in the background and may take 9 minutes or more. Use “Reload saved ratings” to see available results.`,
      ),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']);
        } else {
          this.collectionError.set(error instanceof HttpErrorResponse && error.status === 409
            ? 'A collection is already running or the worker is temporarily unavailable. Try again later.'
            : 'Unable to request collection. Check that ratings tracking is still enabled and try again.');
        }
      },
    });
  }

  load(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.service.getRatings().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading.set(false)),
    ).subscribe({
      next: applications => {
        this.applications.set(applications);
        if (!applications.some(app => app.applicationId === this.selectedId())) {
          this.selectedId.set(applications[0]?.applicationId ?? '');
        }
        this.loadComparison();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']);
        } else {
          this.errorMessage.set('Unable to load ratings. Reload to try again. Previously loaded data, if shown, has not been updated.');
        }
      },
    });
  }
}
