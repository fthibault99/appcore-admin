import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminAnalyticsService } from './admin-analytics.service';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let http: HttpTestingController;
  const eventsUrl = `${environment.apiBaseUrl}/api/admin/analytics/events`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminAnalyticsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('gets events with credentials, supported filters, and pagination', () => {
    service
      .getEvents({
        eventType: 'app.opened',
        clientId: 'Meal Master',
        platform: 'ios',
        appVersion: '2.1',
        anonymousUserId: 'anon',
        sessionId: 'session',
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-02T00:00:00.000Z',
        page: 2,
        size: 50,
        sort: 'receivedAt,desc',
      })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url === eventsUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.params.get('eventType')).toBe('app.opened');
    expect(request.request.params.get('clientId')).toBe('Meal Master');
    expect(request.request.params.get('platform')).toBe('ios');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    expect(request.request.params.get('sort')).toBe('receivedAt,desc');
    request.flush({
      content: [],
      number: 2,
      size: 50,
      totalElements: 0,
      totalPages: 0,
      first: false,
      last: true,
    });
  });

  it('omits undefined and empty filters without mutating the input', () => {
    const filters = {
      eventType: '  ',
      platform: undefined,
      page: 0,
      size: 25,
      sort: 'receivedAt,desc',
    };
    service.getEvents(filters).subscribe();
    const request = http.expectOne((candidate) => candidate.url === eventsUrl);
    expect(request.request.params.has('eventType')).toBe(false);
    expect(request.request.params.has('platform')).toBe(false);
    expect(filters.eventType).toBe('  ');
    request.flush({
      content: [],
      number: 0,
      size: 25,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });
  });

  it('gets an event detail with credentials', () => {
    service.getEvent('event/id').subscribe();
    const request = http.expectOne(`${eventsUrl}/event%2Fid`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });
});
