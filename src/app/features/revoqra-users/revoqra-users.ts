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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminRevoqraService } from '../../core/revoqra/admin-revoqra.service';
import {
  RevoqraEntitlement,
  RevoqraPage,
  RevoqraUser,
} from '../../core/revoqra/admin-revoqra.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
@Component({
  selector: 'app-revoqra-users',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './revoqra-users.html',
  styleUrl: './revoqra-users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevoqraUsersComponent implements OnInit {
  private readonly service = inject(AdminRevoqraService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly email = new FormControl('', { nonNullable: true });
  readonly providerSubscriptionId = new FormControl('', { nonNullable: true });
  readonly page = signal<RevoqraPage<RevoqraUser> | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly deletingUserId = signal<string | null>(null);
  readonly savingAccountTypeId = signal<string | null>(null);
  readonly entitlements = signal<RevoqraEntitlement[]>([]);
  readonly entitlementError = signal(false);
  readonly savingPlan = signal<string | null>(null);
  pageNumber = 0;
  ngOnInit() {
    this.load();
    this.loadEntitlements();
  }
  loadEntitlements() {
    this.service.getEntitlements().subscribe({
      next: (v) => this.entitlements.set(v),
      error: () => this.entitlementError.set(true),
    });
  }
  updateProfiles(item: RevoqraEntitlement, value: string) {
    item.allowedProfiles = value
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
  saveEntitlement(v: RevoqraEntitlement) {
    this.savingPlan.set(v.plan);
    this.service
      .updateEntitlement(v.plan, {
        monthlyCredits: v.monthlyCredits,
        maxScheduledResearches: v.maxScheduledResearches,
        maxUltraRunsPerPeriod: v.maxUltraRunsPerPeriod,
        apiAccess: v.apiAccess,
        allowedProfiles: v.allowedProfiles,
      })
      .pipe(finalize(() => this.savingPlan.set(null)))
      .subscribe({
        next: (x) => this.entitlements.update((all) => all.map((e) => (e.plan === x.plan ? x : e))),
      });
  }
  search() {
    this.pageNumber = 0;
    this.load();
  }
  previous() {
    if (!this.page()?.first) {
      this.pageNumber--;
      this.load();
    }
  }
  next() {
    if (!this.page()?.last) {
      this.pageNumber++;
      this.load();
    }
  }
  deleteUser(user: RevoqraUser) {
    if (
      !window.confirm(
        `Delete Revoqra user ${user.email || user.id}? This permanently removes the account and its research data.`,
      )
    )
      return;
    this.deletingUserId.set(user.id);
    this.deleteError.set(null);
    this.service
      .deleteUser(user.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingUserId.set(null)),
      )
      .subscribe({
        next: () => {
          if ((this.page()?.content.length ?? 0) === 1 && this.pageNumber > 0) this.pageNumber--;
          this.load();
        },
        error: (failure: HttpErrorResponse) =>
          this.deleteError.set(
            failure.status === 409
              ? 'Cancel the active Stripe subscription before deleting this user.'
              : 'Unable to delete the Revoqra user.',
          ),
      });
  }
  updateAccountType(user: RevoqraUser, accountType: 'STANDARD' | 'INTERNAL') {
    if (user.accountType === accountType) return;
    this.savingAccountTypeId.set(user.id);
    this.deleteError.set(null);
    this.service
      .updateAccountType(user.id, accountType)
      .pipe(finalize(() => this.savingAccountTypeId.set(null)))
      .subscribe({
        next: (updated) =>
          this.page.update((page) =>
            page
              ? { ...page, content: page.content.map((value) => (value.id === updated.id ? updated : value)) }
              : page,
          ),
        error: () => {
          this.deleteError.set('Unable to update the Revoqra account type.');
          this.load();
        },
      });
  }
  statusLabel(status: string | null | undefined): string {
    const value = status?.toUpperCase();
    return value === 'ACTIVE'
      ? 'Active'
      : value === 'CANCELED'
        ? 'Canceled'
        : value === 'PAST_DUE'
          ? 'Past due'
          : value === 'CHECKOUT_PENDING'
            ? 'Checkout pending'
            : value
              ? value.toLowerCase().replaceAll('_', ' ')
              : '—';
  }
  billingLabel(subscription: RevoqraUser['subscription']): string {
    if (!subscription) return '—';
    const dateValue = subscription.cancelAt || subscription.currentPeriodEnd;
    const date = dateValue
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateValue))
      : null;
    if (subscription.status?.toUpperCase() === 'CANCELED')
      return date ? `Ended ${date}` : 'Canceled';
    if (
      subscription.status?.toUpperCase() === 'ACTIVE' &&
      (subscription.cancelAtPeriodEnd || subscription.cancelAt)
    )
      return date ? `Cancels ${date}` : 'Cancellation scheduled';
    if (subscription.status?.toUpperCase() === 'ACTIVE') return date ? `Renews ${date}` : 'Renews';
    return date ? `Period ends ${date}` : '—';
  }
  billingClass(subscription: RevoqraUser['subscription']): string {
    if (!subscription) return '';
    if (subscription.status?.toUpperCase() === 'CANCELED') return 'billing-canceled';
    if (
      subscription.status?.toUpperCase() === 'ACTIVE' &&
      (subscription.cancelAtPeriodEnd || subscription.cancelAt)
    )
      return 'billing-scheduled';
    return '';
  }
  private load() {
    this.loading.set(true);
    this.error.set(false);
    this.service
      .getUsers(this.email.value, this.providerSubscriptionId.value, this.pageNumber)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (p) => this.page.set(p),
        error: (e) => {
          if (e instanceof HttpErrorResponse && [401, 403].includes(e.status))
            void this.router.navigate(['/login']);
          else this.error.set(true);
        },
      });
  }
}
