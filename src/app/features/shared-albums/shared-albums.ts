import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  AdminSharedAlbumService,
  SharedAlbumPage,
} from '../../core/shared-albums/admin-shared-album.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-shared-albums',
  imports: [DatePipe, AdminHeaderComponent],
  templateUrl: './shared-albums.html',
  styleUrl: './shared-albums.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedAlbumsComponent implements OnInit {
  private readonly service = inject(AdminSharedAlbumService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly result = signal<SharedAlbumPage | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(page = this.result()?.number ?? 0): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.service
      .list(page)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            void this.router.navigate(['/login']);
          } else {
            this.errorMessage.set(
              'Unable to load shared albums. Reload to try again. Previously loaded results have not been updated.',
            );
          }
        },
      });
  }
}
