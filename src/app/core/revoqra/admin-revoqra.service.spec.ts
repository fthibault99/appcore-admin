import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminRevoqraService } from './admin-revoqra.service';

describe('AdminRevoqraService', () => {
  let service: AdminRevoqraService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}/api/admin/revoqra`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminRevoqraService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets CSRF before deleting a Revoqra user', () => {
    service.deleteUser('user/id').subscribe();
    flushCsrf();

    const request = http.expectOne(`${base}/users/user%2Fid`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('gets CSRF before deleting a billing event', () => {
    service.deleteEvent('event/id').subscribe();
    flushCsrf();

    const request = http.expectOne(`${base}/billing-events/event%2Fid`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  function flushCsrf(): void {
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'token' },
    });
  }
});
