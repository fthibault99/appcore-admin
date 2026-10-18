import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AdminOpenAIUsageService } from '../../core/openai-usage/admin-openai-usage.service';
import { OpenAIUsagePage, OpenAIUsageSummary, OpenAIUsageStatistics } from '../../core/openai-usage/openai-usage.models';
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
  private defaultPeriod(): { from: string; to: string } {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: this.localDateTime(from), to: this.localDateTime(to) };
  }
  private localDateTime(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  readonly period = new FormGroup({
    from: new FormControl(this.defaultPeriod().from, { nonNullable: true, validators: [Validators.required] }),
    to: new FormControl(this.defaultPeriod().to, { nonNullable: true, validators: [Validators.required] }),
  });
  readonly invalidPeriod = signal(false);
  readonly statistics = signal<OpenAIUsageStatistics | null>(null);
  readonly features = computed(() => [...new Set(this.statistics()?.rows.map(row => row.feature) ?? [])]);
  readonly unpricedRequests = computed(() => this.statistics()?.rows.reduce((sum, row) => sum + row.totalRequests - row.pricedRequests, 0) ?? 0);
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
  reset(): void { this.filters.reset(); this.period.reset(this.defaultPeriod()); this.search(); }
  retry(): void { this.load(); }
  previous(): void { if (!this.page()?.first) { this.pageNumber--; this.load(); } }
  next(): void { if (!this.page()?.last) { this.pageNumber++; this.load(); } }
  view(id: string): void { void this.router.navigate(['/openai/usage', id]); }

  shiftPeriod(direction: -1 | 1): void {
    if (this.isLoading()) return;
    const dates = this.period.getRawValue();
    const from = new Date(dates.from).getTime();
    const to = new Date(dates.to).getTime();
    const duration = to - from;
    if (this.period.invalid || !Number.isFinite(duration) || duration < 0) {
      this.invalidPeriod.set(true);
      return;
    }
    if (duration === 0) return;
    const shiftedFrom = new Date(from + direction * duration);
    const shiftedTo = new Date(to + direction * duration);
    if (!Number.isFinite(shiftedFrom.getTime()) || !Number.isFinite(shiftedTo.getTime())) {
      this.invalidPeriod.set(true);
      return;
    }
    this.period.setValue({ from: this.localDateTime(shiftedFrom), to: this.localDateTime(shiftedTo) });
    this.search();
  }

  private load(): void {
    if (this.isLoading()) return;
    const dates = this.period.getRawValue();
    const fromDate = new Date(dates.from);
    const toDate = new Date(dates.to);
    if (this.period.invalid || !Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime()) || fromDate > toDate) {
      this.invalidPeriod.set(true);
      return;
    }
    this.invalidPeriod.set(false);
    const from = fromDate.toISOString();
    const to = toDate.toISOString();
    const filters = this.filters.getRawValue();
    this.isLoading.set(true);
    this.hasError.set(false);
    this.summary.set(null);
    this.statistics.set(null);
    forkJoin({
      page: this.service.getUsage(filters.feature, filters.status, this.pageNumber, this.pageSize, from, to),
      summary: this.service.getSummary(from, to),
      statistics: this.service.getStatistics(from, to),
    }).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: ({ page, summary, statistics }) => { this.page.set(page); this.summary.set(summary); this.statistics.set(statistics); },
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
