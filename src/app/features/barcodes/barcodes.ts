import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, expand, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BarcodeDomain, BarcodeEnrichmentResult, BarcodePage } from '../../core/barcodes/admin-barcode.models';
import { AdminBarcodeService } from '../../core/barcodes/admin-barcode.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

const barcodesStateKey = 'appcore-admin.barcodes.filters';

@Component({
  selector: 'app-barcodes',
  imports: [DatePipe, ReactiveFormsModule, AdminHeaderComponent],
  templateUrl: './barcodes.html',
  styleUrl: './barcodes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodesComponent implements OnInit {
  private readonly service = inject(AdminBarcodeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private pageNumber = 0;
  private readonly pageSize = 25;
  readonly filterForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    domain: new FormControl<BarcodeDomain | ''>('', { nonNullable: true }),
    missingLegoSetNumber: new FormControl(false, { nonNullable: true }),
  });
  readonly page = signal<BarcodePage | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly isEnriching = signal(false);
  readonly enrichment = signal<BarcodeEnrichmentResult | null>(null);
  readonly enrichmentError = signal('');

  ngOnInit(): void {
    this.restoreState();
    this.load();
  }
  search(): void {
    this.pageNumber = 0;
    this.load();
  }
  reset(): void {
    this.filterForm.reset();
    this.search();
  }
  previous(): void {
    if (!this.page()?.first) {
      this.pageNumber--;
      this.load();
    }
  }
  next(): void {
    if (!this.page()?.last) {
      this.pageNumber++;
      this.load();
    }
  }
  view(id: number): void {
    void this.router.navigate(['/barcodes', id]);
  }
  retry(): void {
    this.load();
  }
  enrichMissingLegoSets(): void {
    if (this.isEnriching() || this.isLoading()) return;
    this.isEnriching.set(true);
    this.enrichment.set(null);
    this.enrichmentError.set('');
    this.service.enrichMissingLegoSets().pipe(
      expand((batch) => batch.hasMore
        ? this.service.enrichMissingLegoSets(batch.nextAfterId) : EMPTY, 1),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isEnriching.set(false)),
    ).subscribe({
      next: (batch) => {
        const previous = this.enrichment();
        this.enrichment.set({
          ...batch,
          processed: (previous?.processed ?? 0) + batch.processed,
          updated: (previous?.updated ?? 0) + batch.updated,
          notFound: (previous?.notFound ?? 0) + batch.notFound,
          skipped: (previous?.skipped ?? 0) + batch.skipped,
        });
        if (!batch.hasMore) this.search();
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']);
          return;
        }
        this.enrichmentError.set(
          error instanceof HttpErrorResponse && error.status === 409
            ? 'A barcode changed during processing. Previous batches were saved. Run again to continue.'
            : 'Unable to complete enrichment. Previous batches were saved. Run again to retry.',
        );
        this.search();
      },
    });
  }
  private restoreState(): void {
    try {
      const stored = sessionStorage.getItem(barcodesStateKey);
      if (!stored) return;
      const state = JSON.parse(stored);
      if (
        !state ||
        typeof state.query !== 'string' ||
        !['', 'FOOD', 'LEGO', 'WINE'].includes(state.domain) ||
        typeof state.missingLegoSetNumber !== 'boolean' ||
        !Number.isSafeInteger(state.page) || state.page < 0
      ) return;
      this.filterForm.setValue({
        query: state.query,
        domain: state.domain,
        missingLegoSetNumber: state.missingLegoSetNumber,
      });
      this.pageNumber = state.page;
    } catch {
      // Keep the list usable if session storage is unavailable or invalid.
    }
  }
  private persistState(): void {
    try {
      sessionStorage.setItem(barcodesStateKey, JSON.stringify({
        ...this.filterForm.getRawValue(),
        page: this.pageNumber,
      }));
    } catch {
      // Keep the list usable if browser storage is unavailable.
    }
  }
  private load(): void {
    if (this.isLoading()) return;
    const filters = this.filterForm.getRawValue();
    this.persistState();
    this.hasError.set(false);
    this.isLoading.set(true);
    this.service
      .getBarcodes(
        filters.query,
        filters.domain,
        this.pageNumber,
        this.pageSize,
        filters.missingLegoSetNumber,
      )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => this.page.set(page),
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
