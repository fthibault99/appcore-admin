import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminBricksetSetDetail,
  AdminBricksetUsageDay,
  AdminBricksetUsageSyncResponse,
  BrickSetDescriptionPage,
  BricksetSetPage,
  BricksetListOptions,
  BricksetSyncConfiguration,
  BricksetSyncStatistics,
  BricksetOldestSet,
} from './admin-brickset.models';

@Injectable({ providedIn: 'root' })
export class AdminBricksetService {
  private readonly http = inject(HttpClient);
  private readonly setsUrl = `${environment.apiBaseUrl}/api/admin/brickset/sets`;
  private readonly usageUrl = `${environment.apiBaseUrl}/api/admin/brickset/usage`;
  private readonly descriptionsUrl = `${environment.apiBaseUrl}/api/admin/brickset/descriptions`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  getSets(search: string, page: number, size: number, options?: BricksetListOptions): Observable<BricksetSetPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) params = params.set('setNumber', search.trim());
    if (options) params = params.set('source', options.source).set('sortBy', options.sortBy).set('direction', options.direction);
    if (options?.hasInstructions) params = params.set('hasInstructions', true);
    if (options?.hasImages) params = params.set('hasImages', true);
    return this.http.get<BricksetSetPage>(this.setsUrl, { params, withCredentials: true });
  }

  getSet(id: number): Observable<AdminBricksetSetDetail> {
    return this.http.get<AdminBricksetSetDetail>(`${this.setsUrl}/${id}`, {
      withCredentials: true,
    });
  }

  refreshSet(id: number): Observable<AdminBricksetSetDetail> {
    return this.csrfHeaders().pipe(switchMap(headers =>
      this.http.post<AdminBricksetSetDetail>(`${this.setsUrl}/${id}/refresh`, null, { headers, withCredentials: true })));
  }

  getDescriptions(setNum: string, page: number, size: number): Observable<BrickSetDescriptionPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (setNum.trim()) params = params.set('setNum', setNum.trim());
    return this.http.get<BrickSetDescriptionPage>(this.descriptionsUrl, {
      params,
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

  getSyncConfiguration(): Observable<BricksetSyncConfiguration> {
    return this.http.get<BricksetSyncConfiguration>(`${environment.apiBaseUrl}/api/admin/brickset/sync/configuration`, { withCredentials: true });
  }

  saveSyncConfiguration(config: BricksetSyncConfiguration): Observable<BricksetSyncConfiguration> {
    return this.csrfHeaders().pipe(switchMap(headers => this.http.put<BricksetSyncConfiguration>(
      `${environment.apiBaseUrl}/api/admin/brickset/sync/configuration`, config,
      { headers, withCredentials: true })));
  }

  getSyncStatistics(): Observable<BricksetSyncStatistics> {
    return this.http.get<BricksetSyncStatistics>(`${environment.apiBaseUrl}/api/admin/brickset/sync/statistics`, { withCredentials: true });
  }

  getOldestSets(): Observable<BricksetOldestSet[]> {
    return this.http.get<BricksetOldestSet[]>(`${environment.apiBaseUrl}/api/admin/brickset/sync/oldest`, { withCredentials: true });
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
