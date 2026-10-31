import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminBricksetSetDetail } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-brickset-set-detail',
  imports: [DatePipe, JsonPipe, RouterLink, AdminHeaderComponent],
  templateUrl: './brickset-set-detail.html',
  styleUrl: './brickset-set-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BricksetSetDetailComponent implements OnInit {
  private readonly service = inject(AdminBricksetService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly detail = signal<AdminBricksetSetDetail | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  readonly isRefreshing = signal(false);
  readonly refreshMessage = signal('');

  refresh(): void {
    const current = this.detail();
    if (!current || this.isRefreshing()) return;
    this.isRefreshing.set(true);
    this.refreshMessage.set('');
    this.service.refreshSet(current.id).pipe(finalize(() => this.isRefreshing.set(false)))
      .subscribe({ next: detail => {
        this.detail.set(detail);
        this.refreshMessage.set('Details, images and instructions updated.');
      }, error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']); return;
        }
        this.refreshMessage.set(error instanceof HttpErrorResponse && error.status === 409
          ? 'The set changed or another synchronization is running. Reload the page and retry.'
          : error instanceof HttpErrorResponse && error.status === 429
          ? 'Brickset refresh is temporarily limited. Please retry later.'
          : 'Unable to refresh this set. The previous cached data was preserved.');
      } });
  }

  ngOnInit(): void {
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    const rawId = this.route.snapshot.paramMap.get('setId');
    const id = Number(rawId);
    if (!rawId || !Number.isSafeInteger(id) || id < 1) {
      this.hasError.set(true);
      return;
    }
    this.hasError.set(false);
    this.isLoading.set(true);
    this.service
      .getSet(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
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
