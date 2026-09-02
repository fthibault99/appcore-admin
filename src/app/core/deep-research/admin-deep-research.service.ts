import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DeepResearchJob, DeepResearchPage } from './deep-research.models';

@Injectable({ providedIn: 'root' })
export class AdminDeepResearchService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/openai/deep-research`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  start(query: string): Observable<DeepResearchJob> {
    return this.withCsrf((headers) =>
      this.http.post<DeepResearchJob>(
        this.url,
        { query: query.trim() },
        {
          headers,
          withCredentials: true,
        },
      ),
    );
  }

  get(id: string): Observable<DeepResearchJob> {
    return this.http.get<DeepResearchJob>(`${this.url}/${encodeURIComponent(id.trim())}`, {
      withCredentials: true,
    });
  }

  list(page = 0, size = 20): Observable<DeepResearchPage> {
    return this.http.get<DeepResearchPage>(this.url, {
      params: { page, size },
      withCredentials: true,
    });
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
