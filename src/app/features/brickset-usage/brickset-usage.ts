import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs';
import { AdminBricksetUsageDay } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-brickset-usage',
  imports: [DatePipe, DecimalPipe, RouterLink, AdminHeaderComponent],
  templateUrl: './brickset-usage.html',
  styleUrl: './brickset-usage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BricksetUsageComponent implements OnInit {
  private readonly service = inject(AdminBricksetService);
  private readonly router = inject(Router);
  readonly usage = signal<AdminBricksetUsageDay[]>([]);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly isTesting = signal(false);
  readonly testMessage = signal<string | null>(null);
  readonly testError = signal(false);
  readonly total = computed(() => this.usage().reduce((sum, day) => sum + day.count, 0));
  readonly average = computed(() => (this.usage().length ? this.total() / this.usage().length : 0));
  readonly peak = computed(() =>
    this.usage().reduce((highest, day) => Math.max(highest, day.count), 0),
  );
  readonly latest = computed(() => this.usage()[0]?.count ?? 0);

  ngOnInit(): void {
    this.load();
  }
  retry(): void {
    this.load();
  }
  testUsage(): void {
    if (this.isTesting() || this.isLoading()) return;
    this.isTesting.set(true);
    this.testMessage.set(null);
    this.testError.set(false);
    this.service
      .syncUsage()
      .pipe(
        switchMap((result) => this.service.getUsage(30).pipe(map((usage) => ({ result, usage })))),
        finalize(() => this.isTesting.set(false)),
      )
      .subscribe({
        next: ({ result, usage }) => {
          this.usage.set(usage);
          this.hasError.set(false);
          this.testMessage.set(
            `getKeyUsageStats succeeded: ${result.daysSynchronized} days synchronized.`,
          );
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            void this.router.navigate(['/login']);
            return;
          }
          this.testError.set(true);
          this.testMessage.set('getKeyUsageStats failed.');
        },
      });
  }
  barWidth(count: number): number {
    return this.peak() === 0 ? 0 : (count / this.peak()) * 100;
  }
  localDate(date: string): Date {
    return new Date(`${date}T00:00:00`);
  }

  private load(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.hasError.set(false);
    this.service
      .getUsage(30)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (usage) => this.usage.set(usage),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            void this.router.navigate(['/login']);
            return;
          }
          this.hasError.set(true);
        },
      });
  }
}
