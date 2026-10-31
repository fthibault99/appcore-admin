import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, finalize, Subscription } from 'rxjs';
import { BricksetDateSort, BricksetSourceFilter, BricksetListOptions, BricksetSetPage, BricksetSyncStatistics, BricksetOldestSet } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-brickset-sets',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './brickset-sets.html',
  styleUrl: './brickset-sets.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BricksetSetsComponent implements OnInit, OnDestroy {
  private readonly service = inject(AdminBricksetService);
  private readonly router = inject(Router);
  private pageNumber = 0;
  private readonly pageSize = 25;
  readonly searchForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    hasInstructions: new FormControl<boolean | null>(null),
    hasImages: new FormControl<boolean | null>(null),
    source: new FormControl<BricksetSourceFilter>('ALL', { nonNullable: true }),
    sortBy: new FormControl<BricksetDateSort>('updatedAt', { nonNullable: true }),
    direction: new FormControl<'ASC' | 'DESC'>('DESC', { nonNullable: true }),
  });
  private activeSearch = '';
  private activeOptions: BricksetListOptions = { source: 'ALL', sortBy: 'updatedAt', direction: 'DESC', hasInstructions: null, hasImages: null };
  private setsRequest?: Subscription;
  readonly page = signal<BricksetSetPage | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  readonly syncForm = new FormGroup({
    enabled: new FormControl(true, { nonNullable: true }),
    minimumAgeDays: new FormControl(90, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(3650)] }),
    dailyCallLimit: new FormControl(20, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(100)] }),
    checkIntervalMinutes: new FormControl(60, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(1440)] }),
    concurrency: new FormControl(1, { nonNullable: true }),
  });
  readonly syncStats = signal<BricksetSyncStatistics | null>(null);
  readonly oldestSets = signal<BricksetOldestSet[]>([]);
  readonly syncBusy = signal(false);
  readonly syncReady = signal(false);
  readonly syncMessage = signal('');

  loadSync(): void {
    if (this.syncBusy()) return;
    this.syncBusy.set(true);
    forkJoin({ config: this.service.getSyncConfiguration(), stats: this.service.getSyncStatistics(), oldest: this.service.getOldestSets() })
      .pipe(finalize(() => this.syncBusy.set(false)))
      .subscribe({ next: result => {
        this.syncForm.setValue(result.config);
        this.syncStats.set(result.stats);
        this.oldestSets.set(result.oldest);
        this.syncReady.set(true);
        this.syncMessage.set('');
      }, error: () => this.syncMessage.set('Unable to load synchronization settings. Retry using Refresh.') });
  }

  saveSync(): void {
    if (this.syncForm.invalid || this.syncBusy() || !this.syncReady()) return;
    this.syncBusy.set(true);
    this.service.saveSyncConfiguration(this.syncForm.getRawValue())
      .pipe(finalize(() => this.syncBusy.set(false)))
      .subscribe({ next: config => {
        this.syncForm.setValue(config);
        this.syncMessage.set('Synchronization settings saved.');
      }, error: () => this.syncMessage.set('Unable to save synchronization settings. Check the values and retry.') });
  }

  ngOnInit(): void {
    this.load();
    this.loadSync();
  }

  search(): void {
    const { query, ...options } = this.searchForm.getRawValue();
    this.activeSearch = query.trim();
    this.activeOptions = options;
    this.pageNumber = 0;
    this.load();
  }

  reset(): void {
    this.searchForm.reset({ query: '', source: 'ALL', sortBy: 'updatedAt', direction: 'DESC', hasInstructions: null, hasImages: null });
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
    void this.router.navigate(['/brickset', id]);
  }

  retry(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.setsRequest?.unsubscribe();
  }

  private load(): void {
    this.setsRequest?.unsubscribe();
    this.hasError.set(false);
    this.isLoading.set(true);
    this.setsRequest = this.service
      .getSets(this.activeSearch, this.pageNumber, this.pageSize, this.activeOptions)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => this.page.set(page),
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
