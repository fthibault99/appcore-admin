import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminRecipeExtractionDomainService } from '../../core/recipe-extraction-domains/admin-recipe-extraction-domain.service';
import { RecipeExtractionDomain, RecipeExtractionDomainReason } from '../../core/recipe-extraction-domains/recipe-extraction-domain.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({ selector: 'app-recipe-extraction-domains', imports: [DatePipe, ReactiveFormsModule, AdminHeaderComponent],
  templateUrl: './recipe-extraction-domains.html', styleUrl: './recipe-extraction-domains.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class RecipeExtractionDomainsComponent implements OnInit {
  private readonly service = inject(AdminRecipeExtractionDomainService); private readonly router = inject(Router);
  readonly domains = signal<RecipeExtractionDomain[]>([]); readonly editing = signal<RecipeExtractionDomain | null>(null);
  readonly isLoading = signal(false); readonly isSaving = signal(false); readonly error = signal<string | null>(null);
  readonly form = new FormGroup({
    domain: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(253)] }),
    active: new FormControl(true, { nonNullable: true }),
    reason: new FormControl<RecipeExtractionDomainReason>('MANUAL', { nonNullable: true }),
    sampleUrl: new FormControl('', { nonNullable: true }), notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });
  ngOnInit(): void { this.load(); }
  edit(value: RecipeExtractionDomain): void {
    this.editing.set(value); this.error.set(null); this.form.setValue({ domain: value.domain, active: value.active,
      reason: value.reason, sampleUrl: value.sampleUrl ?? '', notes: value.notes ?? '' });
  }
  reset(): void { this.editing.set(null); this.error.set(null); this.form.reset({ domain: '', active: true, reason: 'MANUAL', sampleUrl: '', notes: '' }); }
  save(): void {
    if (this.form.invalid || this.isSaving()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); const current = this.editing(); this.isSaving.set(true); this.error.set(null);
    const request = current
      ? this.service.update(current.id, { ...value, sampleUrl: value.sampleUrl.trim() || null, notes: value.notes.trim() || null, expectedVersion: current.version })
      : this.service.create({ domain: value.domain, sampleUrl: value.sampleUrl.trim() || null, notes: value.notes.trim() || null });
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({ next: () => { this.reset(); this.load(); }, error: (e: unknown) => this.handleError(e, 'Unable to save the domain.') });
  }
  remove(value: RecipeExtractionDomain): void {
    if (!confirm(`Delete ${value.domain}?`) || this.isSaving()) return;
    this.isSaving.set(true); this.service.delete(value.id, value.version).pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({ next: () => { if (this.editing()?.id === value.id) this.reset(); this.load(); }, error: (e: unknown) => this.handleError(e, 'Unable to delete the domain.') });
  }
  private load(): void {
    this.isLoading.set(true); this.error.set(null); this.service.getAll().pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (values) => this.domains.set(values), error: (e: unknown) => this.handleError(e, 'Unable to load extraction domains.') });
  }
  private handleError(error: unknown, message: string): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) { void this.router.navigate(['/login']); return; }
    this.error.set(message);
  }
}
