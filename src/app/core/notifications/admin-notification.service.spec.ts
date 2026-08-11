import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminNotificationService } from './admin-notification.service';

describe('AdminNotificationService', () => {
  let service: AdminNotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminNotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches CSRF then requests a test email with the admin session', () => {
    service.sendTestEmail().subscribe((response) => {
      expect(response.status).toBe('DISPATCH_ATTEMPTED');
    });

    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });

    const request = http.expectOne(`${environment.apiBaseUrl}/api/admin/notifications/test`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    request.flush({ status: 'DISPATCH_ATTEMPTED', attemptedAt: '2026-08-11T20:00:00Z' });
  });
});
