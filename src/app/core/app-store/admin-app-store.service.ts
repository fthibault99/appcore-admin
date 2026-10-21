import { AppStoreNotesRequest, AppStoreApprovalPreview, AppStoreApprovalRequest, AppStoreWriteApproval } from './app-store-approval.models';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { AppStoreRatings, AppStoreRatingsComparison, AppStoreRatingsRefreshAccepted } from './app-store-ratings.models';
import { AppStoreConnection, AppStorePairingCode } from './app-store-connection.models';
import { environment } from '../../../environments/environment';
import {
  AppStoreApplication,
  CreateAppStoreApplication,
  UpdateAppStoreApplication,
  AppStoreNotificationDetail,
  AppStoreNotificationFilters,
  AppStoreNotificationPage,
} from './app-store-notification.models';

@Injectable({ providedIn: 'root' })
export class AdminAppStoreService {
  private readonly http = inject(HttpClient);
  private readonly notificationsUrl = `${environment.apiBaseUrl}/api/admin/app-store/notifications`;
  private readonly applicationsUrl = `${environment.apiBaseUrl}/api/admin/app-store/applications`;
  private readonly notificationTypesUrl = `${this.notificationsUrl}/filter-options/types`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  previewReleaseNotes(request: AppStoreNotesRequest): Observable<AppStoreApprovalPreview> {
    return this.withCsrf((headers) => this.http.post<AppStoreApprovalPreview>(
      `${environment.apiBaseUrl}/api/admin/app-store-connect/approvals/preview`, request,
      { headers, withCredentials: true },
    ));
  }

  approveReleaseNotes(request: AppStoreApprovalRequest): Observable<AppStoreWriteApproval> {
    return this.withCsrf((headers) => this.http.post<AppStoreWriteApproval>(
      `${environment.apiBaseUrl}/api/admin/app-store-connect/approvals`, request,
      { headers, withCredentials: true },
    ));
  }

  getConnections(): Observable<AppStoreConnection[]> {
    return this.http.get<AppStoreConnection[]>(
      `${environment.apiBaseUrl}/api/admin/app-store-connect/connections`,
      { withCredentials: true },
    );
  }

  generateReconnectCode(subject: string): Observable<AppStorePairingCode> {
    return this.withCsrf((headers) =>
      this.http.post<AppStorePairingCode>(
        `${environment.apiBaseUrl}/api/admin/app-store-connect/connections/${encodeURIComponent(subject)}/pairing-code`,
        null,
        { headers, withCredentials: true },
      ),
    );
  }

  getRatings(): Observable<AppStoreRatings[]> {
    return this.http.get<AppStoreRatings[]>(`${environment.apiBaseUrl}/api/admin/app-store/ratings`, {
      withCredentials: true,
    });
  }

  compareRatings(id: string, from?: string, to?: string): Observable<AppStoreRatingsComparison> {
    let params = new HttpParams();
    if (from && to) params = params.set('from', from).set('to', to);
    return this.http.get<AppStoreRatingsComparison>(
      `${this.applicationsUrl}/${encodeURIComponent(id)}/ratings/comparison`,
      { params, withCredentials: true },
    );
  }

  refreshRatings(id: string): Observable<AppStoreRatingsRefreshAccepted> {
    return this.withCsrf((headers) =>
      this.http.post<AppStoreRatingsRefreshAccepted>(
        `${this.applicationsUrl}/${encodeURIComponent(id)}/ratings/refresh`, null,
        { headers, withCredentials: true },
      ),
    );
  }

  getApplications(): Observable<AppStoreApplication[]> {
    return this.http.get<AppStoreApplication[]>(this.applicationsUrl, { withCredentials: true });
  }

  getNotificationTypes(): Observable<string[]> {
    return this.http.get<string[]>(this.notificationTypesUrl, { withCredentials: true });
  }

  createApplication(request: CreateAppStoreApplication): Observable<AppStoreApplication> {
    return this.withCsrf((headers) =>
      this.http.post<AppStoreApplication>(this.applicationsUrl, request, { headers, withCredentials: true }),
    );
  }

  updateApplication(id: string, request: UpdateAppStoreApplication): Observable<AppStoreApplication> {
    return this.withCsrf((headers) =>
      this.http.put<AppStoreApplication>(`${this.applicationsUrl}/${encodeURIComponent(id)}`, request, {
        headers,
        withCredentials: true,
      }),
    );
  }

  getNotifications(filters: AppStoreNotificationFilters): Observable<AppStoreNotificationPage> {
    let params = new HttpParams();
    for (const [name, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(name, String(value));
    }
    return this.http.get<AppStoreNotificationPage>(this.notificationsUrl, {
      params,
      withCredentials: true,
    });
  }

  getNotification(id: string): Observable<AppStoreNotificationDetail> {
    return this.http.get<AppStoreNotificationDetail>(
      `${this.notificationsUrl}/${encodeURIComponent(id)}`,
      { withCredentials: true },
    );
  }

  private withCsrf<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.http
      .get(this.csrfUrl, { observe: 'response', responseType: 'text', withCredentials: true })
      .pipe(
        map((response) => {
          const token = response.headers.get('X-XSRF-TOKEN');
          if (!token) throw new Error('The AppCore CSRF token is missing.');
          return new HttpHeaders({ 'X-XSRF-TOKEN': token });
        }),
        switchMap(request),
      );
  }
}
