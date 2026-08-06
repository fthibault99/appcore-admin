import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminRecipeDetail, Recipe, RecipePage } from './admin-recipe.models';

@Injectable({ providedIn: 'root' })
export class AdminRecipeService {
  private readonly http = inject(HttpClient);
  private readonly recipesUrl = `${environment.apiBaseUrl}/api/admin/recipes`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  getRecipes(query: string, page: number, size: number): Observable<RecipePage> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'updatedAt,desc');
    if (query.trim()) params = params.set('query', query.trim());
    return this.http.get<RecipePage>(this.recipesUrl, { params, withCredentials: true });
  }

  getRecipe(id: string): Observable<AdminRecipeDetail> {
    return this.http.get<AdminRecipeDetail>(`${this.recipesUrl}/${encodeURIComponent(id)}`, {
      withCredentials: true,
    });
  }

  updateRecipe(id: string, expectedVersion: number, recipe: Recipe): Observable<AdminRecipeDetail> {
    return this.withCsrf((headers) =>
      this.http.put<AdminRecipeDetail>(
        `${this.recipesUrl}/${encodeURIComponent(id)}`,
        { expectedVersion, recipe },
        { headers, withCredentials: true },
      ),
    );
  }

  restoreAutomatic(id: string, expectedVersion: number): Observable<AdminRecipeDetail> {
    const params = new HttpParams().set('expectedVersion', expectedVersion);
    return this.withCsrf((headers) =>
      this.http.post<AdminRecipeDetail>(
        `${this.recipesUrl}/${encodeURIComponent(id)}/restore-auto`,
        null,
        { headers, params, withCredentials: true },
      ),
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
