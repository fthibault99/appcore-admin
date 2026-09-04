import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminDeepResearchService } from './admin-deep-research.service';

describe('AdminDeepResearchService', () => {
  let service: AdminDeepResearchService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/admin/openai/deep-research`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminDeepResearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('retrieves an existing job without creating a new research request', () => {
    service.get('f8854820-d070-46e2-824b-7cdbc5ef6d08').subscribe();

    const request = http.expectOne(`${url}/f8854820-d070-46e2-824b-7cdbc5ef6d08`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });

  it('lists research jobs with pagination', () => {
    service.list(2, 20).subscribe();

    const request = http.expectOne(`${url}?page=2&size=20`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ content: [], number: 2, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('obtains CSRF before starting a job', () => {
    service.start('Research this', 'DEEP').subscribe();

    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ query: 'Research this', profile: 'DEEP' });
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });

  it('updates an evaluation with CSRF protection', () => {
    service
      .updateEvaluation('f8854820-d070-46e2-824b-7cdbc5ef6d08', 'GOOD', ' Useful ')
      .subscribe();

    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });
    const request = http.expectOne(`${url}/f8854820-d070-46e2-824b-7cdbc5ef6d08/evaluation`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ qualityRating: 'GOOD', qualityNotes: 'Useful' });
    request.flush({});
  });
});
