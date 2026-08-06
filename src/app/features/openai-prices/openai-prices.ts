import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminOpenAIUsageService } from '../../core/openai-usage/admin-openai-usage.service';
import { CreateOpenAIModelPrice, OpenAIModelPrice } from '../../core/openai-usage/openai-usage.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-openai-prices',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './openai-prices.html',
  styleUrl: './openai-prices.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenAIPricesComponent implements OnInit {
  private readonly service = inject(AdminOpenAIUsageService);
  private readonly router = inject(Router);
  readonly prices = signal<OpenAIModelPrice[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly hasError = signal(false);
  readonly saveError = signal('');
  readonly adding = signal(false);
  readonly form = new FormGroup({
    model: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    serviceTier: new FormControl('STANDARD', { nonNullable: true, validators: [Validators.required] }),
    contextType: new FormControl('SHORT', { nonNullable: true, validators: [Validators.required] }),
    minInputTokens: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    maxInputTokens: new FormControl<number | null>(272000, { validators: [Validators.min(0)] }),
    inputUsdPerMillion: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    cachedInputUsdPerMillion: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    cacheWriteUsdPerMillion: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    outputUsdPerMillion: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    effectiveFrom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    effectiveTo: new FormControl('', { nonNullable: true }),
    version: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    sourceUrl: new FormControl('https://openai.com/api/pricing/', { nonNullable: true }),
  });

  ngOnInit(): void { this.load(); }
  retry(): void { this.load(); }
  startAdding(): void { this.saveError.set(''); this.adding.set(true); }
  cancel(): void { this.saveError.set(''); this.adding.set(false); }
  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) return;
    const value = this.form.getRawValue();
    const request: CreateOpenAIModelPrice = {
      model: value.model.trim(), serviceTier: value.serviceTier, contextType: value.contextType,
      minInputTokens: value.minInputTokens, maxInputTokens: value.maxInputTokens,
      inputUsdPerMillion: value.inputUsdPerMillion,
      cachedInputUsdPerMillion: value.cachedInputUsdPerMillion,
      cacheWriteUsdPerMillion: value.cacheWriteUsdPerMillion,
      outputUsdPerMillion: value.outputUsdPerMillion,
      effectiveFrom: new Date(value.effectiveFrom).toISOString(),
      effectiveTo: value.effectiveTo ? new Date(value.effectiveTo).toISOString() : null,
      version: value.version.trim(), sourceUrl: value.sourceUrl.trim() || null,
    };
    this.isSaving.set(true); this.saveError.set('');
    this.service.createPrice(request).pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => { this.adding.set(false); this.load(); },
      error: (error: unknown) => {
        this.saveError.set(error instanceof HttpErrorResponse && error.status === 400
          ? 'This price is invalid or overlaps an existing price period.'
          : 'Unable to save this price.');
      },
    });
  }

  private load(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true); this.hasError.set(false);
    this.service.getPrices().pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (prices) => this.prices.set(prices),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']); return;
        }
        this.hasError.set(true);
      },
    });
  }
}
