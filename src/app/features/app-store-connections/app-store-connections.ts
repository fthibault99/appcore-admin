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
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AppStoreConnection } from '../../core/app-store/app-store-connection.models';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-store-connections',
  imports: [DatePipe, AdminHeaderComponent],
  templateUrl: './app-store-connections.html',
  styleUrl: './app-store-connections.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStoreConnectionsComponent implements OnInit {
  private readonly service = inject(AdminAppStoreService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly connections = signal<AppStoreConnection[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copyMessage = signal<string | null>(null);
  readonly copyError = signal<string | null>(null);
  readonly allowlistedCount = computed(
    () => this.connections().filter((row) => row.allowlisted).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.copyMessage.set(null);
    this.copyError.set(null);
    this.service
      .getConnections()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (connections) => this.connections.set(connections),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            void this.router.navigate(['/login']);
          } else if (error instanceof HttpErrorResponse && error.status === 404) {
            this.errorMessage.set(
              'Connections are unavailable. Check that App Store Connect is enabled and the backend endpoint is deployed.',
            );
          } else {
            this.errorMessage.set(
              'Unable to load connections. Reload to try again. Previously loaded connections have not been updated.',
            );
          }
        },
      });
  }

  async copySubject(subject: string): Promise<void> {
    this.copyMessage.set(null);
    this.copyError.set(null);
    try {
      await navigator.clipboard.writeText(subject);
      this.copyMessage.set(`OAuth subject copied: ${subject}`);
    } catch {
      this.copyError.set('Unable to copy. Select and copy the OAuth subject manually.');
    }
  }
}
