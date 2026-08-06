import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentAdminUser } from './current-admin-user';

@Injectable({ providedIn: 'root' })
export class AdminAuthenticationService {
  private readonly http = inject(HttpClient);
  private readonly authenticationUrl = `${environment.apiBaseUrl}/api/admin/auth`;

  login(email: string, password: string): Observable<void> {
    return this.getCsrfToken().pipe(
      switchMap((csrfToken) =>
        this.http.post<void>(
          `${this.authenticationUrl}/login`,
          { email, password },
          {
            headers: new HttpHeaders({ 'X-XSRF-TOKEN': csrfToken }),
            withCredentials: true,
            responseType: 'json',
          },
        ),
      ),
    );
  }

  getCurrentUser(): Observable<CurrentAdminUser> {
    return this.http.get<CurrentAdminUser>(`${this.authenticationUrl}/me`, {
      withCredentials: true,
    });
  }

  logout(): Observable<void> {
    return this.getCsrfToken().pipe(
      switchMap((csrfToken) =>
        this.http.post<void>(`${this.authenticationUrl}/logout`, null, {
          headers: new HttpHeaders({ 'X-XSRF-TOKEN': csrfToken }),
          withCredentials: true,
        }),
      ),
    );
  }

  private getCsrfToken(): Observable<string> {
    return this.http
      .get(`${this.authenticationUrl}/csrf`, {
        observe: 'response',
        responseType: 'text',
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          const csrfToken = response.headers.get('X-XSRF-TOKEN');
          if (!csrfToken) throw new Error('The AppCore CSRF token is missing.');
          return csrfToken;
        }),
      );
  }
}
