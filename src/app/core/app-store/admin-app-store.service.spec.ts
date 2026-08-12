import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminAppStoreService } from './admin-app-store.service';

describe('AdminAppStoreService', () => {
  let service: AdminAppStoreService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminAppStoreService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads filtered notifications with the admin session', () => {
    service.getNotifications({ environment: 'Sandbox', page: 0, size: 50, sort: 'receivedAt,desc' }).subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${environment.apiBaseUrl}/api/admin/app-store/notifications`,
    );
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.params.get('environment')).toBe('Sandbox');
    request.flush({ content: [], number: 0, size: 50, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('loads distinct notification types stored by AppCore', () => {
    service.getNotificationTypes().subscribe((types) => {
      expect(types).toEqual(['CONSUMPTION_REQUEST', 'ONE_TIME_CHARGE']);
    });

    const request = http.expectOne(
      `${environment.apiBaseUrl}/api/admin/app-store/notifications/filter-options/types`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(['CONSUMPTION_REQUEST', 'ONE_TIME_CHARGE']);
  });

  it('gets CSRF before registering an application', () => {
    service.createApplication({
      applicationKey: 'do-it-tomorrow', displayName: 'Do It Tomorrow',
      bundleId: 'com.fstt.doit', appAppleId: 123456789,
    }).subscribe();

    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });
    const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/app-store/applications`);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    request.flush({});
  });
});
