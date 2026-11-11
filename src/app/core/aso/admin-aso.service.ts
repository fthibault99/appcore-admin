import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface Measurement {
  periodType: string;
  periodStart: string;
  periodEnd: string;
  popularity100: number | null;
  popularity5: number | null;
  popularityInGenre: number | null;
  rankInGenre: number | null;
  collectedAt: string;
}
export interface Keyword {
  id: number;
  searchTerm: string;
  countryOrRegion: string;
  genre: string;
  latest: Measurement | null;
}
export interface Page<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface Week {
  start: string;
  end: string;
}
export interface AsoOptions {
  countries: string[];
  genres: string[];
  weeks: Week[];
}
export interface AvailableTerms {
  periodStart: string;
  periodEnd: string;
  countryOrRegion: string;
  genre: string;
  terms: { searchTerm: string; popularity100: number | null; rankInGenre: number | null }[];
}
@Injectable({ providedIn: 'root' })
export class AdminAsoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/aso`;
  options() {
    return this.http.get<AsoOptions>(`${this.url}/options`, {
      withCredentials: true,
    });
  }
  list(page: number, sortBy: string, direction: string) {
    return this.http.get<Page<Keyword>>(`${this.url}/keywords`, {
      withCredentials: true,
      params: new HttpParams()
        .set('page', page)
        .set('size', 25)
        .set('sortBy', sortBy)
        .set('direction', direction),
    });
  }
  history(id: number, page: number) {
    return this.http.get<Page<Measurement>>(`${this.url}/keywords/${id}/history`, {
      withCredentials: true,
      params: new HttpParams().set('page', page).set('size', 25),
    });
  }
  create(value: { searchTerm: string; countryOrRegion: string; genre: string }) {
    return this.headers().pipe(
      switchMap((headers) =>
        this.http.post<Keyword>(`${this.url}/keywords`, value, { headers, withCredentials: true }),
      ),
    );
  }
  collect(id: number, weekStart?: string) {
    return this.headers().pipe(
      switchMap((headers) =>
        this.http.post<{
          empty: boolean;
          periodStart: string;
          periodEnd: string;
          availability: 'AVAILABLE' | 'KEYWORD_ABSENT' | 'PERIOD_EMPTY';
        }>(`${this.url}/keywords/${id}/collect`, null, {
          headers,
          withCredentials: true,
          params: weekStart ? new HttpParams().set('weekStart', weekStart) : new HttpParams(),
        }),
      ),
    );
  }
  availableTerms(id: number, weekStart: string) {
    return this.headers().pipe(
      switchMap((headers) =>
        this.http.post<AvailableTerms>(`${this.url}/keywords/${id}/available-terms`, null, {
          headers,
          withCredentials: true,
          params: new HttpParams().set('weekStart', weekStart),
        }),
      ),
    );
  }
  private headers() {
    return this.http
      .get(`${environment.apiBaseUrl}/api/admin/auth/csrf`, {
        observe: 'response',
        responseType: 'text',
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          const token = response.headers.get('X-XSRF-TOKEN');
          if (!token) throw new Error('Jeton CSRF manquant.');
          return new HttpHeaders({ 'X-XSRF-TOKEN': token });
        }),
      );
  }
}
