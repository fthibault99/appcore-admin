import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminAuthenticationService } from './admin-authentication.service';

describe('AdminAuthenticationService', () => {
  let service: AdminAuthenticationService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminAuthenticationService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('gets a CSRF token before posting the credentials and handles HTTP 204', () => {
    let completed = false;

    service.login('admin@example.com', 'secret').subscribe({
      complete: () => (completed = true),
    });

    const csrfRequest = httpController.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    expect(csrfRequest.request.method).toBe('GET');
    expect(csrfRequest.request.withCredentials).toBe(true);
    expect(csrfRequest.request.responseType).toBe('text');
    csrfRequest.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'csrf-token' },
    });

    const loginRequest = httpController.expectOne(`${environment.apiBaseUrl}/api/admin/auth/login`);
    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.body).toEqual({ email: 'admin@example.com', password: 'secret' });
    expect(loginRequest.request.withCredentials).toBe(true);
    expect(loginRequest.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(loginRequest.request.responseType).toBe('json');

    loginRequest.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });

  it('gets the current admin user with credentials enabled', () => {
    const user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' as const };

    service.getCurrentUser().subscribe((result) => expect(result).toEqual(user));

    const request = httpController.expectOne(`${environment.apiBaseUrl}/api/admin/auth/me`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(user);
  });

  it('gets a CSRF token before logging out', () => {
    service.logout().subscribe();

    const csrfRequest = httpController.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    expect(csrfRequest.request.method).toBe('GET');
    csrfRequest.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'logout-token' },
    });

    const logoutRequest = httpController.expectOne(`${environment.apiBaseUrl}/api/admin/auth/logout`);
    expect(logoutRequest.request.method).toBe('POST');
    expect(logoutRequest.request.withCredentials).toBe(true);
    expect(logoutRequest.request.headers.get('X-XSRF-TOKEN')).toBe('logout-token');
    logoutRequest.flush(null, { status: 204, statusText: 'No Content' });
  });
});
