import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TestNotificationResponse {
  status: 'DISPATCH_ATTEMPTED';
  attemptedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationService {
  private readonly http = inject(HttpClient);
  private readonly testUrl = `${environment.apiBaseUrl}/api/admin/notifications/test`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  sendTestEmail(): Observable<TestNotificationResponse> {
    return this.http
      .get(this.csrfUrl, { observe: 'response', responseType: 'text', withCredentials: true })
      .pipe(
        map((response) => {
          const token = response.headers.get('X-XSRF-TOKEN');
          if (!token) throw new Error('The AppCore CSRF token is missing.');
          return new HttpHeaders({ 'X-XSRF-TOKEN': token });
        }),
        switchMap((headers) =>
          this.http.post<TestNotificationResponse>(this.testUrl, null, {
            headers,
            withCredentials: true,
          }),
        ),
      );
  }
}
