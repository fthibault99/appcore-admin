import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminBarcodeDetail,
  BarcodeDomain,
  BarcodePage,
  UpdateAdminBarcode,
} from './admin-barcode.models';

@Injectable({ providedIn: 'root' })
export class AdminBarcodeService {
  private readonly http = inject(HttpClient);
  private readonly barcodesUrl = `${environment.apiBaseUrl}/api/admin/barcodes`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  getBarcodes(
    query: string,
    domain: BarcodeDomain | '',
    page: number,
    size: number,
  ): Observable<BarcodePage> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'updatedAt,desc');
    if (query.trim()) params = params.set('query', query.trim());
    if (domain) params = params.set('domain', domain);
    return this.http.get<BarcodePage>(this.barcodesUrl, { params, withCredentials: true });
  }

  getBarcode(id: number): Observable<AdminBarcodeDetail> {
    return this.http.get<AdminBarcodeDetail>(`${this.barcodesUrl}/${id}`, {
      withCredentials: true,
    });
  }

  updateBarcode(id: number, update: UpdateAdminBarcode): Observable<AdminBarcodeDetail> {
    return this.withCsrf((headers) =>
      this.http.put<AdminBarcodeDetail>(`${this.barcodesUrl}/${id}`, update, {
        headers,
        withCredentials: true,
      }),
    );
  }

  restoreAutomatic(id: number, expectedVersion: number): Observable<AdminBarcodeDetail> {
    const params = new HttpParams().set('expectedVersion', expectedVersion);
    return this.withCsrf((headers) =>
      this.http.post<AdminBarcodeDetail>(`${this.barcodesUrl}/${id}/restore-auto`, null, {
        headers,
        params,
        withCredentials: true,
      }),
    );
  }

  deleteBarcode(id: number, expectedVersion: number): Observable<void> {
    const params = new HttpParams().set('expectedVersion', expectedVersion);
    return this.withCsrf((headers) =>
      this.http.delete<void>(`${this.barcodesUrl}/${id}`, {
        headers,
        params,
        withCredentials: true,
      }),
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
