import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateRecipeExtractionDomain, RecipeExtractionDomain, UpdateRecipeExtractionDomain } from './recipe-extraction-domain.models';

@Injectable({ providedIn: 'root' })
export class AdminRecipeExtractionDomainService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/recipe-extraction-domains`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  getAll(): Observable<RecipeExtractionDomain[]> {
    return this.http.get<RecipeExtractionDomain[]>(this.url, { withCredentials: true });
  }
  create(value: CreateRecipeExtractionDomain): Observable<RecipeExtractionDomain> {
    return this.withCsrf((headers) => this.http.post<RecipeExtractionDomain>(this.url, value, { headers, withCredentials: true }));
  }
  update(id: number, value: UpdateRecipeExtractionDomain): Observable<RecipeExtractionDomain> {
    return this.withCsrf((headers) => this.http.put<RecipeExtractionDomain>(`${this.url}/${id}`, value, { headers, withCredentials: true }));
  }
  delete(id: number, expectedVersion: number): Observable<void> {
    const params = new HttpParams().set('expectedVersion', expectedVersion);
    return this.withCsrf((headers) => this.http.delete<void>(`${this.url}/${id}`, { headers, params, withCredentials: true }));
  }
  private withCsrf<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.http.get(this.csrfUrl, { observe: 'response', responseType: 'text', withCredentials: true }).pipe(
      map((response) => {
        const token = response.headers.get('X-XSRF-TOKEN');
        if (!token) throw new Error('The AppCore CSRF token is missing.');
        return new HttpHeaders({ 'X-XSRF-TOKEN': token });
      }), switchMap(request));
  }
}
