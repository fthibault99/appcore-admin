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

  it('loads App Store Connect connections using the admin session', () => {
    service.getConnections().subscribe(result => expect(result).toEqual([]));
    const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/app-store-connect/connections`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush([]);
  });

  it('loads ratings using the admin session', () => {
    service.getRatings().subscribe(result => expect(result).toEqual([]));
    const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/app-store/ratings`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush([]);
  });

  it('requests ratings collection with CSRF and the admin session', () => {
    const accepted = { runId: 'run-1', applicationId: 'app/1', country: null };
    service.refreshRatings('app/1').subscribe(result => expect(result).toEqual(accepted));
    http.expectNone(`${environment.apiBaseUrl}/api/admin/app-store/applications/app%2F1/ratings/refresh`);
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });
    const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/app-store/applications/app%2F1/ratings/refresh`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    request.flush(accepted, { status: 202, statusText: 'Accepted' });
  });

  it('does not send a collection request without a CSRF token', () => {
    let error: unknown;
    service.refreshRatings('app-1').subscribe({ error: value => error = value });
    http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`).flush('');
    expect(error).toBeInstanceOf(Error);
    http.expectNone(`${environment.apiBaseUrl}/api/admin/app-store/applications/app-1/ratings/refresh`);
  });

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
      bundleId: 'com.fstt.doit', appAppleId: 123456789, ratingsEnabled: true,
    }).subscribe();

    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });
    const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/app-store/applications`);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(request.request.body.ratingsEnabled).toBe(true);
    request.flush({});
  });
});
