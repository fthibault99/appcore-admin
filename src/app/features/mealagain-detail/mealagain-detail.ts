import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Observable, Subscription } from 'rxjs';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
import { AdminMealAgainService } from '../../core/mealagain/admin-mealagain.service';
import {
  MealAgainAccountDetail,
  MealAgainEnvironment,
  MealAgainPage,
  MealAgainPurchase,
  MealAgainUsage,
} from '../../core/mealagain/admin-mealagain.models';

@Component({
  selector: 'app-mealagain-detail',
  imports: [DatePipe, RouterLink, AdminHeaderComponent],
  templateUrl: './mealagain-detail.html',
  styleUrl: './mealagain-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealAgainDetailComponent implements OnInit {
  private readonly service = inject(AdminMealAgainService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private detailRequest?: Subscription;
  private historyRequest?: Subscription;
  private userId = '';
  private historyPageNumber = 0;
  readonly detail = signal<MealAgainAccountDetail | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly historyKind = signal<'purchases' | 'usages'>('purchases');
  readonly environment = signal<MealAgainEnvironment | ''>('');
  readonly historyLoading = signal(false);
  readonly historyError = signal(false);
  readonly purchases = signal<MealAgainPage<MealAgainPurchase> | null>(null);
  readonly usages = signal<MealAgainPage<MealAgainUsage> | null>(null);
  readonly historyPage = computed(() =>
    this.historyKind() === 'purchases' ? this.purchases() : this.usages(),
  );
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.userId = params.get('userId') ?? '';
      this.environment.set('');
      this.historyPageNumber = 0;
      this.load();
    });
  }
  retry() {
    this.load();
  }
  selectHistory(kind: 'purchases' | 'usages') {
    this.historyKind.set(kind);
    this.historyPageNumber = 0;
    this.loadHistory();
  }
  selectEnvironment(event: Event) {
    this.environment.set((event.target as HTMLSelectElement).value as MealAgainEnvironment | '');
    this.historyPageNumber = 0;
    this.loadHistory();
  }
  previous() {
    if (!this.historyLoading() && this.historyPage() && !this.historyPage()!.first) {
      this.historyPageNumber--;
      this.loadHistory();
    }
  }
  next() {
    if (!this.historyLoading() && this.historyPage() && !this.historyPage()!.last) {
      this.historyPageNumber++;
      this.loadHistory();
    }
  }
  private load() {
    this.detailRequest?.unsubscribe();
    this.historyRequest?.unsubscribe();
    this.detail.set(null);
    this.purchases.set(null);
    this.usages.set(null);
    this.error.set('');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.userId)) {
      this.error.set('Invalid user UUID.');
      return;
    }
    this.isLoading.set(true);
    this.detailRequest = this.service
      .getAccount(this.userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          this.loadHistory();
        },
        error: (error: unknown) => {
          if (this.authError(error)) return;
          this.error.set(
            error instanceof HttpErrorResponse && error.status === 404
              ? 'MealAgain account not found.'
              : 'Unable to load this account.',
          );
        },
      });
  }
  loadHistory() {
    this.historyRequest?.unsubscribe();
    this.purchases.set(null);
    this.usages.set(null);
    this.historyError.set(false);
    if (!this.detail()) return;
    this.historyLoading.set(true);
    if (this.historyKind() === 'purchases')
      this.observeHistory(
        this.service.getPurchases(this.userId, this.environment(), this.historyPageNumber),
        (page) => this.purchases.set(page),
      );
    else
      this.observeHistory(
        this.service.getUsages(this.userId, this.environment(), this.historyPageNumber),
        (page) => this.usages.set(page),
      );
  }
  private observeHistory<T>(source: Observable<T>, accept: (page: T) => void) {
    this.historyRequest = source
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.historyLoading.set(false)),
      )
      .subscribe({
        next: accept,
        error: (error: unknown) => {
          if (!this.authError(error)) this.historyError.set(true);
        },
      });
  }
  private authError(error: unknown) {
    if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
      void this.router.navigate(['/login']);
      return true;
    }
    return false;
  }
}
