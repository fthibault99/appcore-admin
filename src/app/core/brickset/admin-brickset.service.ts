import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminBricksetSetDetail,
  AdminBricksetUsageDay,
  AdminBricksetUsageSyncResponse,
  BricksetSetPage,
} from './admin-brickset.models';

@Injectable({ providedIn: 'root' })
export class AdminBricksetService {
  private readonly http = inject(HttpClient);
  private readonly setsUrl = `${environment.apiBaseUrl}/api/admin/brickset/sets`;
  private readonly usageUrl = `${environment.apiBaseUrl}/api/admin/brickset/usage`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  getSets(setNumber: string, page: number, size: number): Observable<BricksetSetPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (setNumber.trim()) params = params.set('setNumber', setNumber.trim());
    return this.http.get<BricksetSetPage>(this.setsUrl, { params, withCredentials: true });
  }

  getSet(id: number): Observable<AdminBricksetSetDetail> {
    return this.http.get<AdminBricksetSetDetail>(`${this.setsUrl}/${id}`, {
      withCredentials: true,
    });
  }

  getUsage(days = 30): Observable<AdminBricksetUsageDay[]> {
    return this.http.get<AdminBricksetUsageDay[]>(this.usageUrl, {
      params: new HttpParams().set('days', days),
      withCredentials: true,
    });
  }

  syncUsage(): Observable<AdminBricksetUsageSyncResponse> {
    return this.csrfHeaders().pipe(
      switchMap((headers) =>
        this.http.post<AdminBricksetUsageSyncResponse>(`${this.usageUrl}/sync`, null, {
          headers,
          withCredentials: true,
        }),
      ),
    );
  }

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http
      .get(this.csrfUrl, {
        observe: 'response',
        responseType: 'text',
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          const token = response.headers.get('X-XSRF-TOKEN');
          if (!token) throw new Error('The AppCore CSRF token is missing.');
          return new HttpHeaders({ 'X-XSRF-TOKEN': token });
        }),
      );
  }
}
