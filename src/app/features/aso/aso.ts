import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, finalize } from 'rxjs';
import {
  AdminAsoService,
  Keyword,
  Measurement,
  Page,
  AsoOptions,
  AvailableTerms,
} from '../../core/aso/admin-aso.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
@Component({
  selector: 'app-aso',
  imports: [AdminHeaderComponent, ReactiveFormsModule, DatePipe],
  templateUrl: './aso.html',
  styleUrl: './aso.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsoComponent {
  private readonly service = inject(AdminAsoService);
  private readonly destroy = inject(DestroyRef);
  private readonly router = inject(Router);
  private listRequest?: Subscription;
  private historyRequest?: Subscription;
  readonly form = inject(FormBuilder).nonNullable.group({
    searchTerm: ['', [Validators.required, Validators.pattern(/\S/)]],
    countryOrRegion: ['CA', Validators.required],
    genre: ['', Validators.required],
  });
  readonly options = signal<AsoOptions>({
    weeks: [],
    countries: [],
    genres: [],
  });
  readonly weekStart = signal('');
  readonly diagnostic = signal<AvailableTerms | null>(null);
  readonly diagnosticLoading = signal(false);
  readonly diagnosticError = signal('');
  readonly rows = signal<Page<Keyword> | null>(null);
  readonly history = signal<Page<Measurement> | null>(null);
  readonly selected = signal<Keyword | null>(null);
  readonly loading = signal(false);
  readonly historyLoading = signal(false);
  readonly saving = signal(false);
  readonly collecting = signal<Set<number>>(new Set());
  readonly error = signal('');
  readonly historyError = signal('');
  readonly message = signal('');
  readonly rowMessages = signal<Record<number, string>>({});
  sortBy = 'searchTerm';
  direction = 'ASC';
  constructor() {
    this.service
      .options()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.options.set(v);
          this.weekStart.set(v.weeks[0]?.start ?? '');
        },
        error: (e) => this.fail(e),
      });
    this.load();
  }
  load(page = 0) {
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.listRequest = this.service
      .list(page, this.sortBy, this.direction)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({ next: (v) => this.rows.set(v), error: (e) => this.fail(e) });
  }
  sort(event: Event) {
    this.sortBy = (event.target as HTMLSelectElement).value;
    this.load();
  }
  reverse() {
    this.direction = this.direction === 'ASC' ? 'DESC' : 'ASC';
    this.load();
  }
  add() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    value.searchTerm = value.searchTerm.normalize('NFC').replace(/\s+/gu, ' ').trim();
    if (
      !value.searchTerm ||
      [...value.searchTerm].length > 512 ||
      value.searchTerm.includes('\0')
    ) {
      this.error.set('Le mot-clé doit contenir entre 1 et 512 caractères valides.');
      return;
    }
    if (
      !this.options().countries.includes(value.countryOrRegion) ||
      !this.options().genres.includes(value.genre)
    ) {
      this.error.set('Sélectionnez un pays et une catégorie valides.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.service
      .create(value)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.form.controls.searchTerm.reset();
          this.load();
          this.message.set('Mot-clé ajouté. Aucune collecte automatique.');
        },
        error: (e) => this.fail(e),
      });
  }
  collect(row: Keyword) {
    if (this.collecting().has(row.id) || this.diagnosticLoading() || !this.weekStart()) return;
    this.collecting.update((v) => new Set([...v, row.id]));
    this.rowMessages.update((v) => ({ ...v, [row.id]: '' }));
    this.service
      .collect(row.id, this.weekStart())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() =>
          this.collecting.update((v) => {
            const next = new Set(v);
            next.delete(row.id);
            return next;
          }),
        ),
      )
      .subscribe({
        next: (result) => {
          this.rowMessages.update((v) => ({
            ...v,
            [row.id]: result.empty
              ? result.availability === 'PERIOD_EMPTY'
                ? `Aucune donnée retournée par Apple pour ${row.countryOrRegion} / ${row.genre}, du ${result.periodStart} au ${result.periodEnd}, même sans filtre de mot-clé.`
                : `Mot-clé absent des données retournées ; d’autres termes sont disponibles pour ${row.countryOrRegion} / ${row.genre}, du ${result.periodStart} au ${result.periodEnd}.`
              : `Collecte terminée : ${result.periodStart} – ${result.periodEnd}`,
          }));
          this.load(this.rows()?.number ?? 0);
          if (this.selected()?.id === row.id) this.showHistory(row);
        },
        error: (e) => {
          this.rowMessages.update((v) => ({ ...v, [row.id]: this.errorText(e) }));
          this.checkAuth(e);
        },
      });
  }
  changeWeek(event: Event) {
    this.weekStart.set((event.target as HTMLSelectElement).value);
    this.rowMessages.set({});
    this.diagnostic.set(null);
    this.diagnosticError.set('');
  }
  availableTerms(row: Keyword) {
    if (this.diagnosticLoading() || this.collecting().size || !this.weekStart()) return;
    this.diagnostic.set(null);
    this.diagnosticError.set('');
    this.diagnosticLoading.set(true);
    this.service
      .availableTerms(row.id, this.weekStart())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.diagnosticLoading.set(false)),
      )
      .subscribe({
        next: (result) => this.diagnostic.set(result),
        error: (e) => {
          this.diagnosticError.set(this.errorText(e));
          this.checkAuth(e);
        },
      });
  }
  showHistory(row: Keyword, page = 0) {
    this.historyRequest?.unsubscribe();
    this.selected.set(row);
    this.history.set(null);
    this.historyLoading.set(true);
    this.historyError.set('');
    this.historyRequest = this.service
      .history(row.id, page)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.historyLoading.set(false)),
      )
      .subscribe({
        next: (v) => this.history.set(v),
        error: (e) => {
          this.historyError.set(this.errorText(e));
          this.checkAuth(e);
        },
      });
  }
  private errorText(error: unknown): string {
    return error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
      ? error.error.message
      : 'Impossible de terminer la requête ASO. Réessayez.';
  }
  private checkAuth(error: unknown) {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))
      void this.router.navigate(['/login']);
  }
  private fail(error: unknown) {
    this.error.set(this.errorText(error));
    this.checkAuth(error);
  }
}
