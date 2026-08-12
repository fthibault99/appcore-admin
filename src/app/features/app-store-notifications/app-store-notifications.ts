import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import {
  AppStoreApplication,
  AppStoreNotificationFilters,
  AppStoreNotificationPage,
} from '../../core/app-store/app-store-notification.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-store-notifications',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './app-store-notifications.html',
  styleUrl: './app-store-notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStoreNotificationsComponent implements OnInit {
  private readonly service = inject(AdminAppStoreService);
  private readonly router = inject(Router);
  private filters: AppStoreNotificationFilters = { page: 0, size: 50, sort: 'receivedAt,desc' };

  readonly page = signal<AppStoreNotificationPage | null>(null);
  readonly applications = signal<AppStoreApplication[]>([]);
  readonly notificationTypes = signal<string[]>([]);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly filterForm = new FormGroup({
    applicationKey: new FormControl('', { nonNullable: true }),
    environment: new FormControl('', { nonNullable: true }),
    notificationType: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.service.getApplications().subscribe({ next: (applications) => this.applications.set(applications) });
    this.service.getNotificationTypes().subscribe({ next: (types) => this.notificationTypes.set(types) });
    this.load();
  }

  search(): void {
    const values = this.filterForm.getRawValue();
    this.filters = {
      applicationKey: values.applicationKey || undefined,
      environment: values.environment || undefined,
      notificationType: values.notificationType.trim() || undefined,
      page: 0,
      size: this.filters.size,
      sort: this.filters.sort,
    };
    this.load();
  }

  reset(): void {
    this.filterForm.reset();
    this.filters = { page: 0, size: this.filters.size, sort: 'receivedAt,desc' };
    this.load();
  }

  previousPage(): void {
    if (!this.page()?.first) this.changePage(this.filters.page - 1);
  }

  nextPage(): void {
    if (!this.page()?.last) this.changePage(this.filters.page + 1);
  }

  view(id: string): void {
    void this.router.navigate(['/app-store/notifications', id]);
  }

  retry(): void {
    this.load();
  }

  private changePage(page: number): void {
    this.filters = { ...this.filters, page };
    this.load();
  }

  private load(): void {
    if (this.isLoading()) return;
    this.hasError.set(false);
    this.isLoading.set(true);
    this.service
      .getNotifications(this.filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => this.page.set(page),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            void this.router.navigate(['/login']);
          } else {
            this.hasError.set(true);
          }
        },
      });
  }
}
