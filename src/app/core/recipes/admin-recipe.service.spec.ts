import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Recipe } from './admin-recipe.models';
import { AdminRecipeService } from './admin-recipe.service';

describe('AdminRecipeService', () => {
  let service: AdminRecipeService;
  let http: HttpTestingController;
  const recipesUrl = `${environment.apiBaseUrl}/api/admin/recipes`;
  const recipe: Recipe = {
    url: 'https://example.com/recipe',
    name: 'Toast',
    image: null,
    author: null,
    datePublished: null,
    description: null,
    prepTime: null,
    cookTime: null,
    totalTime: null,
    keywords: null,
    recipeIngredient: ['bread'],
    recipeInstructions: ['Toast it.'],
    recipeYield: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminRecipeService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('searches paginated recipe summaries', () => {
    service.getRecipes(' toast ', 2, 25).subscribe();
    const request = http.expectOne((candidate) => candidate.url === recipesUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.params.get('query')).toBe('toast');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('sort')).toBe('updatedAt,desc');
    request.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 25,
      number: 2,
      first: false,
      last: true,
    });
  });

  it('gets CSRF before saving a typed recipe and sends its expected version', () => {
    service.updateRecipe('recipe/id', 7, recipe).subscribe();
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'token' },
    });
    const request = http.expectOne(`${recipesUrl}/recipe%2Fid`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token');
    expect(request.request.body).toEqual({ expectedVersion: 7, recipe });
    request.flush({});
  });

  it('gets CSRF before restoring automatic updates', () => {
    service.restoreAutomatic('id', 3).subscribe();
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'token' },
    });
    const request = http.expectOne(
      (candidate) => candidate.url === `${recipesUrl}/id/restore-auto`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.params.get('expectedVersion')).toBe('3');
    request.flush({});
  });
});
