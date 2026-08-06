import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminOpenAIUsageService } from '../../core/openai-usage/admin-openai-usage.service';
import { OpenAIUsage } from '../../core/openai-usage/openai-usage.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-openai-usage-detail',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, AdminHeaderComponent],
  templateUrl: './openai-usage-detail.html',
  styleUrl: './openai-usage-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenAIUsageDetailComponent implements OnInit {
  private readonly service = inject(AdminOpenAIUsageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly detail = signal<OpenAIUsage | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  ngOnInit(): void { this.load(); }
  retry(): void { this.load(); }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('usageId');
    if (!id) { this.hasError.set(true); return; }
    this.isLoading.set(true);
    this.hasError.set(false);
    this.service.getUsageDetail(id).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (detail) => this.detail.set(detail),
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
