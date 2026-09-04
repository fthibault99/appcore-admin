import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { marked } from 'marked';
import { AdminDeepResearchService } from '../../core/deep-research/admin-deep-research.service';
import {
  DeepResearchJob,
  DeepResearchPage,
  DeepResearchProfile,
  DeepResearchQualityRating,
} from '../../core/deep-research/deep-research.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-deep-research',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, AdminHeaderComponent],
  templateUrl: './deep-research.html',
  styleUrl: './deep-research.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeepResearchComponent implements OnInit, OnDestroy {
  private readonly service = inject(AdminDeepResearchService);
  private readonly router = inject(Router);
  private polling?: Subscription;

  readonly job = signal<DeepResearchJob | null>(null);
  readonly isStarting = signal(false);
  readonly isLoadingJob = signal(false);
  readonly isPolling = signal(false);
  readonly isLoadingList = signal(false);
  readonly isSavingEvaluation = signal(false);
  readonly jobsPage = signal<DeepResearchPage | null>(null);
  readonly errorMessage = signal('');
  readonly hasActiveResearch = computed(() => {
    const job = this.job();
    return (
      job !== null && ['QUEUED', 'IN_PROGRESS'].includes(job.status)
    );
  });
  readonly queryForm = new FormGroup({
    query: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20000)],
    }),
    profile: new FormControl<DeepResearchProfile>('STANDARD', { nonNullable: true }),
  });
  readonly evaluationForm = new FormGroup({
    qualityRating: new FormControl<DeepResearchQualityRating | null>(null),
    qualityNotes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(4000)],
    }),
  });
  readonly jobForm = new FormGroup({
    id: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      ],
    }),
  });
  readonly waitingMessage = computed(() => {
    const status = this.job()?.status;
    if (status === 'QUEUED') return 'Research queued. Waiting for OpenAI to begin…';
    if (status === 'IN_PROGRESS')
      return 'Research in progress. Sources are being searched and the report is being prepared…';
    return '';
  });
  readonly reportHtml = computed(() => {
    const report = this.job()?.report;
    return report ? marked.parse(report, { async: false, gfm: true }) : '';
  });

  ngOnInit(): void {
    this.loadList(0);
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
  }

  start(): void {
    this.queryForm.markAllAsTouched();
    if (this.queryForm.invalid || this.isStarting() || this.hasActiveResearch()) return;
    this.stopPolling();
    this.errorMessage.set('');
    this.isStarting.set(true);
    this.service
      .start(this.queryForm.controls.query.value, this.queryForm.controls.profile.value)
      .pipe(finalize(() => this.isStarting.set(false)))
      .subscribe({
        next: (job) => {
          this.setJob(job);
          this.jobForm.controls.id.setValue(job.id);
          this.loadList(0);
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

  loadList(page: number): void {
    if (page < 0 || this.isLoadingList()) return;
    this.isLoadingList.set(true);
    this.service
      .list(page)
      .pipe(finalize(() => this.isLoadingList.set(false)))
      .subscribe({
        next: (jobsPage) => this.jobsPage.set(jobsPage),
        error: (error: unknown) => this.handleError(error, 'Unable to load the research list.'),
      });
  }

  openJob(id: string): void {
    this.jobForm.controls.id.setValue(id);
    this.poll(id, 0);
  }

  print(): void {
    window.print();
  }

  saveEvaluation(): void {
    const job = this.job();
    this.evaluationForm.markAllAsTouched();
    if (!job || this.evaluationForm.invalid || this.isSavingEvaluation()) return;
    this.errorMessage.set('');
    this.isSavingEvaluation.set(true);
    this.service
      .updateEvaluation(
        job.id,
        this.evaluationForm.controls.qualityRating.value,
        this.evaluationForm.controls.qualityNotes.value,
      )
      .pipe(finalize(() => this.isSavingEvaluation.set(false)))
      .subscribe({
        next: (updated) => {
          this.setJob(updated);
          this.loadList(this.jobsPage()?.number ?? 0);
        },
        error: (error: unknown) => this.handleError(error, 'Unable to save the evaluation.'),
      });
  }

  profileDescription(profile: DeepResearchProfile): string {
    if (profile === 'QUICK')
      return 'Fast, low-cost research. Luna / up to 3 target searches / low reasoning / 10 min timeout.';
    if (profile === 'DEEP')
      return 'More extensive research. Terra / up to 20 target searches / high reasoning / 30 min timeout.';
    if (profile === 'EXPERT')
      return 'Expert-grade research. Sol / up to 30 target searches / high reasoning / 45 min timeout.';
    if (profile === 'ULTRA')
      return 'Maximum-depth research. Astra / up to 50 target searches / high reasoning / 60 min timeout.';
    return 'Balanced research. Luna / up to 8 target searches / medium reasoning / 15 min timeout.';
  }

  durationLabel(durationMs: number | null): string {
    if (durationMs === null) return '—';
    const seconds = Math.round(durationMs / 1000);
    if (seconds < 60) return `${seconds} sec`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ${seconds % 60} sec`;
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
          this.setJob(job);
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

  private setJob(job: DeepResearchJob): void {
    this.job.set(job);
    this.evaluationForm.setValue({
      qualityRating: job.qualityRating,
      qualityNotes: job.qualityNotes ?? '',
    });
  }

  private isTerminal(job: DeepResearchJob): boolean {
    return ['COMPLETED', 'FAILED', 'CANCELLED', 'INCOMPLETE', 'TIMED_OUT'].includes(job.status);
  }

  private handleError(error: unknown, fallback: string): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      void this.router.navigate(['/login']);
      return;
    }
    this.errorMessage.set(
      error instanceof HttpErrorResponse && error.status === 404
        ? 'No research job was found for this ID.'
        : fallback,
    );
  }
}
