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
import { finalize, Subscription, timer } from 'rxjs';
import {
  AppStoreConnection,
  AppStorePairingCode,
} from '../../core/app-store/app-store-connection.models';
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
  readonly generatingSubject = signal<string | null>(null);
  readonly pairingCode = signal<AppStorePairingCode | null>(null);
  readonly pairingError = signal<string | null>(null);
  readonly pairingNotice = signal<string | null>(null);
  private expiration?: Subscription;
  readonly allowlistedCount = computed(
    () => this.connections().filter((row) => row.allowlisted).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.isLoading() || this.generatingSubject()) return;
    this.clearPairingCode();
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

  generateReconnectCode(connection: AppStoreConnection): void {
    if (!connection.allowlisted || this.generatingSubject() || this.isLoading()) return;
    this.clearPairingCode();
    this.generatingSubject.set(connection.subject);
    this.service
      .generateReconnectCode(connection.subject)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.generatingSubject.set(null)),
      )
      .subscribe({
        next: (result) => {
          const remaining = Date.parse(result.expiresAt) - Date.now();
          if (!/^\d{6}$/.test(result.code) || !Number.isFinite(remaining) || remaining <= 0) {
            this.pairingError.set('The code is unavailable or expired. Generate a new code.');
            return;
          }
          this.pairingCode.set(result);
          this.expiration = timer(remaining)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.pairingCode.set(null);
              this.pairingNotice.set('The code has expired. Generate a new code to continue.');
              this.copyMessage.set(null);
            });
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            void this.router.navigate(['/login']);
          } else if (error instanceof HttpErrorResponse && error.status === 404) {
            this.pairingError.set(
              'Reconnection is unavailable. Reload connections; the backend may need updating.',
            );
          } else if (
            error instanceof HttpErrorResponse &&
            (error.status === 403 || error.status === 409)
          ) {
            this.pairingError.set(
              'This connection is no longer authorized. Reload connections and choose an authorized connection.',
            );
          } else {
            this.pairingError.set('Unable to generate a code. Try again.');
          }
        },
      });
  }

  async copyPairingCode(): Promise<void> {
    const code = this.pairingCode();
    if (!code || Date.parse(code.expiresAt) <= Date.now()) return;
    this.copyMessage.set(null);
    this.copyError.set(null);
    try {
      await navigator.clipboard.writeText(code.code);
      this.copyMessage.set('Reconnection code copied.');
    } catch {
      this.copyError.set('Unable to copy. Select and copy the code manually.');
    }
  }

  private clearPairingCode(): void {
    this.expiration?.unsubscribe();
    this.pairingCode.set(null);
    this.pairingError.set(null);
    this.pairingNotice.set(null);
    this.copyMessage.set(null);
    this.copyError.set(null);
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
