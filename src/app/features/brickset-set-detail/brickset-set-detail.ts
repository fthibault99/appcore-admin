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
