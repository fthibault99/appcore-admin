import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateOpenAIModelPrice, OpenAIModelPrice, OpenAIUsage, OpenAIUsagePage, OpenAIUsageSummary } from './openai-usage.models';

@Injectable({ providedIn: 'root' })
export class AdminOpenAIUsageService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/openai/usage`;
  private readonly pricesUrl = `${environment.apiBaseUrl}/api/admin/openai/prices`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  getUsage(feature: string, status: string, page: number, size: number): Observable<OpenAIUsagePage> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'startedAt,desc');
    if (feature.trim()) params = params.set('feature', feature.trim());
    if (status) params = params.set('status', status);
    return this.http.get<OpenAIUsagePage>(this.url, { params, withCredentials: true });
  }

  getSummary(): Observable<OpenAIUsageSummary> {
    return this.http.get<OpenAIUsageSummary>(`${this.url}/summary`, { withCredentials: true });
  }

  getUsageDetail(id: string): Observable<OpenAIUsage> {
    return this.http.get<OpenAIUsage>(`${this.url}/${id}`, { withCredentials: true });
  }

  getPrices(): Observable<OpenAIModelPrice[]> {
    return this.http.get<OpenAIModelPrice[]>(this.pricesUrl, { withCredentials: true });
  }

  createPrice(price: CreateOpenAIModelPrice): Observable<OpenAIModelPrice> {
    return this.withCsrf((headers) => this.http.post<OpenAIModelPrice>(this.pricesUrl, price, {
      headers, withCredentials: true,
    }));
  }

  private withCsrf<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.http.get(this.csrfUrl, {
      observe: 'response', responseType: 'text', withCredentials: true,
    }).pipe(
      map((response) => {
        const token = response.headers.get('X-XSRF-TOKEN');
        if (!token) throw new Error('The AppCore CSRF token is missing.');
        return new HttpHeaders({ 'X-XSRF-TOKEN': token });
      }),
      switchMap(request),
    );
  }
}
