import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminBarcodeDetail, UpdateAdminBarcode } from '../../core/barcodes/admin-barcode.models';
import { AdminBarcodeService } from '../../core/barcodes/admin-barcode.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-barcode-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './barcode-detail.html',
  styleUrl: './barcode-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeDetailComponent implements OnInit {
  private readonly service = inject(AdminBarcodeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly detail = signal<AdminBarcodeDetail | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly hasError = signal(false);
  readonly editing = signal(false);
  readonly saveError = signal('');
  readonly form = new FormGroup({
    productName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100_000)],
    }),
    brand: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    legoSetNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^\d{3,7}-\d{1,2}$/)],
    }),
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2_048)] }),
    ingredients: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100_000)],
    }),
  });

  ngOnInit(): void {
    this.load();
  }
  retry(): void {
    this.load();
  }
  startEditing(): void {
    const data = this.detail();
    if (!data) return;
    this.form.setValue({
      productName: data.productName ?? '',
      description: data.description ?? '',
      brand: data.brand ?? '',
      category: data.category ?? '',
      legoSetNumber: data.legoSetNumber ?? '',
      imageUrl: data.imageUrl ?? '',
      ingredients: data.ingredients ?? '',
    });
    this.saveError.set('');
    this.editing.set(true);
  }
  cancelEditing(): void {
    this.editing.set(false);
    this.saveError.set('');
  }
  save(): void {
    const data = this.detail();
    this.form.markAllAsTouched();
    if (!data || this.form.invalid || this.isSaving()) return;
    const value = this.form.getRawValue();
    const update: UpdateAdminBarcode = {
      expectedVersion: data.version,
      productName: value.productName.trim(),
      description: this.nullable(value.description),
      brand: this.nullable(value.brand),
      category: this.nullable(value.category),
      legoSetNumber: this.nullable(value.legoSetNumber),
      imageUrl: this.nullable(value.imageUrl),
      ingredients: this.nullable(value.ingredients),
    };
    this.isSaving.set(true);
    this.saveError.set('');
    this.service
      .updateBarcode(data.id, update)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.detail.set(updated);
          this.editing.set(false);
        },
        error: (error: unknown) => this.handleSaveError(error),
      });
  }
  restoreAutomatic(): void {
    const data = this.detail();
    if (!data || !data.manualOverride || this.isSaving()) return;
    this.isSaving.set(true);
    this.saveError.set('');
    this.service
      .restoreAutomatic(data.id, data.version)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.detail.set(updated);
          this.editing.set(false);
        },
        error: (error: unknown) => this.handleSaveError(error),
      });
  }
  deleteBarcode(): void {
    const data = this.detail();
    if (!data || this.isSaving()) return;
    const confirmed = globalThis.confirm(
      `Delete barcode ${data.barcode} from the ${data.lookupDomain} cache? A later scan can recreate it.`,
    );
    if (!confirmed) return;
    this.isSaving.set(true);
    this.saveError.set('');
    this.service
      .deleteBarcode(data.id, data.version)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/barcodes']),
        error: (error: unknown) => this.handleSaveError(error),
      });
  }
  private load(): void {
    const rawId = this.route.snapshot.paramMap.get('barcodeId');
    const id = Number(rawId);
    if (!rawId || !Number.isSafeInteger(id) || id < 1) {
      this.hasError.set(true);
      return;
    }
    this.isLoading.set(true);
    this.hasError.set(false);
    this.service
      .getBarcode(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.detail.set(data),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))
            void this.router.navigate(['/login']);
          else this.hasError.set(true);
        },
      });
  }
  private nullable(value: string): string | null {
    return value.trim() || null;
  }
  private handleSaveError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409)
      this.saveError.set('This product changed since it was opened. Reload it before saving.');
    else if (error instanceof HttpErrorResponse && error.status === 400)
      this.saveError.set('The product contains invalid data. Check the name and image URL.');
    else this.saveError.set('Unable to save the barcode product. Please try again.');
  }
}
