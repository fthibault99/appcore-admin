import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminBricksetService } from './admin-brickset.service';

describe('AdminBricksetService', () => {
  let service: AdminBricksetService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/admin/brickset/sets`;
  const usageUrl = `${environment.apiBaseUrl}/api/admin/brickset/usage`;
  const descriptionsUrl = `${environment.apiBaseUrl}/api/admin/brickset/descriptions`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminBricksetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches by trimmed set number with pagination', () => {
    service.getSets(' 75313 ', 1, 25).subscribe();

    const request = http.expectOne((candidate) => candidate.url === url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('setNumber')).toBe('75313');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('25');
    expect(request.request.withCredentials).toBe(true);
    request.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 25,
      number: 1,
      first: false,
      last: true,
    });
  });

  it('loads a Brickset cache detail', () => {
    service.getSet(7).subscribe();

    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ id: 7 });
  });

  it('searches generated descriptions by trimmed set number with pagination', () => {
    service.getDescriptions(' 10307 ', 2, 25).subscribe();

    const request = http.expectOne((candidate) => candidate.url === descriptionsUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('setNum')).toBe('10307');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('25');
    expect(request.request.withCredentials).toBe(true);
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

  it('loads the last 30 days of Brickset API usage', () => {
    service.getUsage().subscribe();

    const request = http.expectOne((candidate) => candidate.url === usageUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('days')).toBe('30');
    expect(request.request.withCredentials).toBe(true);
    request.flush([]);
  });

  it('synchronizes Brickset API usage with CSRF protection', () => {
    service.syncUsage().subscribe((result) => expect(result.daysSynchronized).toBe(30));

    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'token' } });

    const request = http.expectOne(`${usageUrl}/sync`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ daysSynchronized: 30 });
  });
  it('saves persistent synchronization configuration using the administrator CSRF token', () => {
    const config = { enabled: false, minimumAgeDays: 90, dailyCallLimit: 20, checkIntervalMinutes: 60, concurrency: 1 };
    service.saveSyncConfiguration(config).subscribe(result => expect(result).toEqual(config));
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'sync-token' } });
    const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/brickset/sync/configuration`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('sync-token');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual(config);
    request.flush(config);
  });

  it('loads sync statistics and oldest sets from authenticated administrator endpoints', () => {
    service.getSyncStatistics().subscribe();
    service.getOldestSets().subscribe();
    for (const endpoint of ['statistics', 'oldest']) {
      const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/brickset/sync/${endpoint}`);
      expect(request.request.withCredentials).toBe(true);
      request.flush(endpoint === 'oldest' ? [] : {});
    }
  });

});
