import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { BarcodeDomain, BarcodePage } from '../../core/barcodes/admin-barcode.models';
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
