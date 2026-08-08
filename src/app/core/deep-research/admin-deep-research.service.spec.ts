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
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
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

  it('obtains CSRF before starting a job', () => {
    service.start('Research this').subscribe();

    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ query: 'Research this' });
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });
});
