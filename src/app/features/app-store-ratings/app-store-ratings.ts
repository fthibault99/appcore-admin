import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AppStoreRatings } from '../../core/app-store/app-store-ratings.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

type CountrySort = 'ratings' | 'average' | 'country';

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
  readonly applications = signal<AppStoreRatings[]>([]);
  readonly selectedId = signal('');
  readonly isLoading = signal(false);
  readonly isRequestingCollection = signal(false);
  readonly collectionMessage = signal<string | null>(null);
  readonly collectionError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly sort = signal<CountrySort>('ratings');
  readonly selected = computed(() => this.applications().find(app => app.applicationId === this.selectedId()));
  readonly countries = computed(() => {
    const rows = [...(this.selected()?.countries ?? [])];
    return rows.sort((a, b) => {
      const difference = this.sort() === 'country'
        ? this.countryName(a.country).localeCompare(this.countryName(b.country))
        : this.sort() === 'average'
          ? (b.averageRating ?? -1) - (a.averageRating ?? -1)
          : b.ratingCount - a.ratingCount;
      return difference || a.country.localeCompare(b.country);
    });
  });

  ngOnInit(): void { this.load(); }

  selectApplication(event: Event): void {
    this.selectedId.set((event.target as HTMLSelectElement).value);
    this.collectionMessage.set(null);
    this.collectionError.set(null);
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
