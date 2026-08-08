import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { marked } from 'marked';
import { AdminDeepResearchService } from '../../core/deep-research/admin-deep-research.service';
import { DeepResearchJob } from '../../core/deep-research/deep-research.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-deep-research',
  imports: [DatePipe, ReactiveFormsModule, AdminHeaderComponent],
  templateUrl: './deep-research.html',
  styleUrl: './deep-research.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeepResearchComponent implements OnDestroy {
  private readonly service = inject(AdminDeepResearchService);
  private readonly router = inject(Router);
  private polling?: Subscription;

  readonly job = signal<DeepResearchJob | null>(null);
  readonly isStarting = signal(false);
  readonly isLoadingJob = signal(false);
  readonly isPolling = signal(false);
  readonly errorMessage = signal('');
  readonly hasActiveResearch = computed(() => {
    const job = this.job();
    return job !== null && !job.report && ['QUEUED', 'IN_PROGRESS', 'INCOMPLETE'].includes(job.status);
  });
  readonly queryForm = new FormGroup({
    query: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(4000)] }),
  });
  readonly jobForm = new FormGroup({
    id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)],
    }),
  });
  readonly waitingMessage = computed(() => {
    const status = this.job()?.status;
    if (status === 'QUEUED') return 'Research queued. Waiting for OpenAI to begin…';
    if (status === 'IN_PROGRESS') return 'Research in progress. Sources are being searched and the report is being prepared…';
    if (status === 'INCOMPLETE' && !this.job()?.report) {
      return 'OpenAI ended before its final status, so AppCore is retrieving any available report…';
    }
    return '';
  });
  readonly reportHtml = computed(() => {
    const report = this.job()?.report;
    return report ? marked.parse(report, { async: false, gfm: true }) : '';
  });

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  start(): void {
    this.queryForm.markAllAsTouched();
    if (this.queryForm.invalid || this.isStarting() || this.hasActiveResearch()) return;
    this.stopPolling();
    this.errorMessage.set('');
    this.isStarting.set(true);
    this.service.start(this.queryForm.controls.query.value)
      .pipe(finalize(() => this.isStarting.set(false)))
      .subscribe({
        next: (job) => {
          this.job.set(job);
          this.jobForm.controls.id.setValue(job.id);
          if (!this.isTerminal(job)) this.poll(job.id, 3000);
        },
        error: (error: unknown) => this.handleError(error, 'Unable to start the research.'),
      });
  }

  load(): void {
    this.jobForm.markAllAsTouched();
    if (this.jobForm.invalid || this.isLoadingJob()) return;
    this.poll(this.jobForm.controls.id.value.trim(), 0);
  }

  refresh(): void {
    const id = this.job()?.id;
    if (id) this.poll(id, 0);
  }

  print(): void {
    window.print();
  }

  private poll(id: string, initialDelay: number): void {
    this.stopPolling();
    this.errorMessage.set('');
    this.isLoadingJob.set(true);
    this.isPolling.set(true);
    this.polling = timer(initialDelay, 3000)
      .pipe(
        switchMap(() => this.service.get(id)),
        takeWhile((job) => !this.isTerminal(job), true),
        finalize(() => {
          this.isLoadingJob.set(false);
          this.isPolling.set(false);
        }),
      )
      .subscribe({
        next: (job) => {
          this.job.set(job);
          this.jobForm.controls.id.setValue(job.id);
        },
        error: (error: unknown) => this.handleError(error, 'Unable to load this research job.'),
      });
  }

  private stopPolling(): void {
    this.polling?.unsubscribe();
    this.polling = undefined;
    this.isPolling.set(false);
    this.isLoadingJob.set(false);
  }

  private isTerminal(job: DeepResearchJob): boolean {
    if (job.status === 'INCOMPLETE') return Boolean(job.report);
    return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status);
  }

  private handleError(error: unknown, fallback: string): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      void this.router.navigate(['/login']);
      return;
    }
    this.errorMessage.set(error instanceof HttpErrorResponse && error.status === 404
      ? 'No research job was found for this ID.'
      : fallback);
  }
}
