import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdminAsoService } from './admin-aso.service';
describe('AdminAsoService HTTP', () => {
  let service: AdminAsoService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminAsoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends list pagination and credentials', () => {
    service.list(2, 'genre', 'DESC').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/aso/keywords'));
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('sortBy')).toBe('genre');
    req.flush({ content: [] });
  });
  it('fetches CSRF before creation and collection', () => {
    for (const collect of [false, true]) {
      if (collect) service.collect(1).subscribe();
      else
        service
          .create({ searchTerm: 'test', countryOrRegion: 'CA', genre: 'LIFESTYLE' })
          .subscribe();
      const csrf = http.expectOne((r) => r.url.endsWith('/auth/csrf'));
      expect(csrf.request.withCredentials).toBe(true);
      csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'test-token' } });
      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('test-token');
      expect(req.request.url.endsWith(collect ? '/1/collect' : '/keywords')).toBe(true);
      req.flush({});
    }
  });
  it('does not write when CSRF is absent', () => {
    let failed = false;
    service.collect(1).subscribe({ error: () => (failed = true) });
    http.expectOne((r) => r.url.endsWith('/auth/csrf')).flush('');
    expect(failed).toBe(true);
    http.expectNone((r) => r.method === 'POST');
  });
  it('paginates history with credentials', () => {
    service.history(4, 1).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/keywords/4/history'));
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ content: [] });
  });
  it('sends selected period and CSRF for available terms and collection', () => {
    service.availableTerms(1, '2026-10-18').subscribe();
    http
      .expectOne((r) => r.url.endsWith('/auth/csrf'))
      .flush('', { headers: { 'X-XSRF-TOKEN': 'test-token' } });
    let req = http.expectOne((r) => r.url.endsWith('/1/available-terms'));
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('test-token');
    expect(req.request.params.get('weekStart')).toBe('2026-10-18');
    req.flush({ terms: [] });
    service.collect(1, '2026-10-18').subscribe();
    http
      .expectOne((r) => r.url.endsWith('/auth/csrf'))
      .flush('', { headers: { 'X-XSRF-TOKEN': 'test-token' } });
    req = http.expectOne((r) => r.url.endsWith('/1/collect'));
    expect(req.request.params.get('weekStart')).toBe('2026-10-18');
    req.flush({});
  });
});
