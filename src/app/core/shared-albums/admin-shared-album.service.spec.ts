import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminSharedAlbumService } from './admin-shared-album.service';

describe('AdminSharedAlbumService', () => {
  it('lists a bounded page using the administrator session', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AdminSharedAlbumService).list(2, 25).subscribe();
    const req = http.expectOne(
      (request) =>
        request.url === `${environment.apiBaseUrl}/api/admin/brick-collector/shared-albums`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('25');
    expect(req.request.headers.has('X-API-Key')).toBe(false);
    req.flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 2,
      first: false,
      last: true,
    });
    http.verify();
  });
});
