import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AppStoreNotificationDetail } from '../../core/app-store/app-store-notification.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-store-notification-detail',
  imports: [DatePipe, JsonPipe, RouterLink, AdminHeaderComponent],
  templateUrl: './app-store-notification-detail.html',
  styleUrl: './app-store-notification-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStoreNotificationDetailComponent implements OnInit {
  private readonly service = inject(AdminAppStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly detail = signal<AppStoreNotificationDetail | null>(null);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('notificationId');
    if (!id) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }
    this.service.getNotification(id).subscribe({
      next: (detail) => { this.detail.set(detail); this.isLoading.set(false); },
      error: (error: unknown) => {
        this.isLoading.set(false);
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']);
        } else {
          this.hasError.set(true);
        }
      },
    });
  }
}
