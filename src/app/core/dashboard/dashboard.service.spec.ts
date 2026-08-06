import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Dashboard } from '../../models/dashboard.models';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('loads the aggregated dashboard using the admin session', () => {
    const dashboard: Dashboard = {
      system: { status: 'UP', version: '', environment: '', uptime: 0 },
      today: {
        analyticsEventsToday: 0,
        recipeExtractionsToday: 0,
        barcodeLookupsToday: 0,
        openAiRequestsToday: 0,
      },
      recentActivity: [],
      recentErrors: [],
    };

    service.getDashboard().subscribe((result) => expect(result).toEqual(dashboard));

    const request = httpController.expectOne(`${environment.apiBaseUrl}/api/admin/dashboard`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(dashboard);
  });
});
