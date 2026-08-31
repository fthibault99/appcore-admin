import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminMealAgainService } from './admin-mealagain.service';

describe('AdminMealAgainService', () => {
  let service: AdminMealAgainService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/api/admin/mealagain/users`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminMealAgainService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses session credentials and paginated UUID search without an application key', () => {
    service.getAccounts(' user-id ', 2).subscribe();
    const req = http.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('X-API-Key')).toBe(false);
    expect(req.request.params.get('userId')).toBe('user-id');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({ content: [] });
  });
  it('reads details and includes unclassified history only when selected', () => {
    service.getAccount('user-id').subscribe();
    const detail = http.expectOne(`${base}/user-id`);
    expect(detail.request.withCredentials).toBe(true);
    detail.flush({});
    service.getPurchases('user-id', 'UNCLASSIFIED', 1).subscribe();
    const purchases = http.expectOne((r) => r.url.endsWith('/purchase-history'));
    expect(purchases.request.params.get('environment')).toBe('UNCLASSIFIED');
    expect(purchases.request.params.get('page')).toBe('1');
    purchases.flush({ content: [] });
    service.getUsages('user-id', '').subscribe();
    const usages = http.expectOne((r) => r.url.endsWith('/usage-history'));
    expect(usages.request.params.has('environment')).toBe(false);
    expect(usages.request.withCredentials).toBe(true);
    usages.flush({ content: [] });
  });
});
