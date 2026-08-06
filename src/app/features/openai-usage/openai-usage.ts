import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AdminOpenAIUsageService } from '../../core/openai-usage/admin-openai-usage.service';
import { OpenAIUsagePage, OpenAIUsageSummary } from '../../core/openai-usage/openai-usage.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-openai-usage',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './openai-usage.html',
  styleUrl: './openai-usage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenAIUsageComponent implements OnInit {
  private readonly service = inject(AdminOpenAIUsageService);
  private readonly router = inject(Router);
  private pageNumber = 0;
  private readonly pageSize = 25;
  readonly filters = new FormGroup({
    feature: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
  });
  readonly page = signal<OpenAIUsagePage | null>(null);
  readonly summary = signal<OpenAIUsageSummary | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  ngOnInit(): void { this.load(); }
  search(): void { this.pageNumber = 0; this.load(); }
  reset(): void { this.filters.reset(); this.search(); }
  retry(): void { this.load(); }
  previous(): void { if (!this.page()?.first) { this.pageNumber--; this.load(); } }
  next(): void { if (!this.page()?.last) { this.pageNumber++; this.load(); } }
  view(id: string): void { void this.router.navigate(['/openai/usage', id]); }

  private load(): void {
    if (this.isLoading()) return;
    const filters = this.filters.getRawValue();
    this.isLoading.set(true);
    this.hasError.set(false);
    forkJoin({
      page: this.service.getUsage(filters.feature, filters.status, this.pageNumber, this.pageSize),
      summary: this.service.getSummary(),
    }).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: ({ page, summary }) => { this.page.set(page); this.summary.set(summary); },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']);
          return;
        }
        this.hasError.set(true);
      },
    });
  }
}
