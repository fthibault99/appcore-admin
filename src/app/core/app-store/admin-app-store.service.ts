import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
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
