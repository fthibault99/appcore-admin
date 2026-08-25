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
    request.flush({ content: [], totalElements: 0, totalPages: 0, size: 25, number: 1, first: false, last: true });
  });

  it('loads a Brickset cache detail', () => {
    service.getSet(7).subscribe();

    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ id: 7 });
  });

  it('loads the last 30 days of Brickset API usage', () => {
    service.getUsage().subscribe();

    const request = http.expectOne((candidate) => candidate.url === usageUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('days')).toBe('30');
    expect(request.request.withCredentials).toBe(true);
    request.flush([]);
  });
});
