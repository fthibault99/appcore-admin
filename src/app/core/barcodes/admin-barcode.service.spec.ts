import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { UpdateAdminBarcode } from './admin-barcode.models';
import { AdminBarcodeService } from './admin-barcode.service';

describe('AdminBarcodeService', () => {
  let service: AdminBarcodeService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/admin/barcodes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminBarcodeService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('searches barcodes with domain and pagination', () => {
    service.getBarcodes(' coffee ', 'FOOD', 1, 25).subscribe();
    const request = http.expectOne((candidate) => candidate.url === url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('query')).toBe('coffee');
    expect(request.request.params.get('domain')).toBe('FOOD');
    expect(request.request.params.get('page')).toBe('1');
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

  it('gets CSRF before updating editable fields', () => {
    const update: UpdateAdminBarcode = {
      expectedVersion: 2,
      productName: 'Coffee',
      description: null,
      brand: 'Brand',
      category: null,
      imageUrl: null,
      ingredients: null,
      legoSetNumber: '4637-1',
    };
    service.updateBarcode(7, update).subscribe();
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'token' },
    });
    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token');
    expect(request.request.body).toEqual(update);
    request.flush({});
  });

  it('gets CSRF before restoring automatic updates', () => {
    service.restoreAutomatic(7, 3).subscribe();
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'token' },
    });
    const request = http.expectOne((candidate) => candidate.url === `${url}/7/restore-auto`);
    expect(request.request.method).toBe('POST');
    expect(request.request.params.get('expectedVersion')).toBe('3');
    request.flush({});
  });

  it('gets CSRF and sends the expected version before deletion', () => {
    service.deleteBarcode(7, 4).subscribe();
    const csrf = http.expectOne(`${environment.apiBaseUrl}/api/admin/auth/csrf`);
    csrf.flush(null, {
      status: 204,
      statusText: 'No Content',
      headers: { 'X-XSRF-TOKEN': 'token' },
    });
    const request = http.expectOne((candidate) => candidate.url === `${url}/7`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.params.get('expectedVersion')).toBe('4');
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
