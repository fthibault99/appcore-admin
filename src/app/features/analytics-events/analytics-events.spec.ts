import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { AdminAnalyticsService } from '../../core/analytics/admin-analytics.service';
import { AnalyticsEventSummary, PageResponse } from '../../core/analytics/analytics-event.models';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AnalyticsEventsComponent } from './analytics-events';

describe('AnalyticsEventsComponent', () => {
  let fixture: ComponentFixture<AnalyticsEventsComponent>;
  let component: AnalyticsEventsComponent;
  let results: Subject<PageResponse<AnalyticsEventSummary>>;
  let service: {
    getEvents: ReturnType<typeof vi.fn>;
    getEventFilterOptions: ReturnType<typeof vi.fn>;
  };
  let authenticationService: { logout: ReturnType<typeof vi.fn> };
  let router: Router;
  const emptyPage = (
    overrides: Partial<PageResponse<AnalyticsEventSummary>> = {},
  ): PageResponse<AnalyticsEventSummary> => ({
    content: [],
    number: 0,
    size: 25,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    ...overrides,
  });

  beforeEach(async () => {
    results = new Subject();
    service = {
      getEvents: vi.fn((): Observable<PageResponse<AnalyticsEventSummary>> =>
        results.asObservable(),
      ),
      getEventFilterOptions: vi.fn(() =>
        of({
          clientNames: ['AppCore', 'Meal Master Plan'],
          applicationNames: ['AppCore Live', 'Meal Master Live'],
        }),
      ),
    };
    authenticationService = { logout: vi.fn(() => of(undefined)) };
    await TestBed.configureTestingModule({
      imports: [AnalyticsEventsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAnalyticsService, useValue: service },
        { provide: AdminAuthenticationService, useValue: authenticationService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalyticsEventsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('loads the first page and exposes loading and empty states', () => {
    fixture.detectChanges();
    expect(service.getEvents).toHaveBeenCalledWith({ page: 0, size: 25, sort: 'receivedAt,desc' });
    expect(component.isLoading()).toBe(true);
    results.next(emptyPage());
    results.complete();
    fixture.detectChanges();
    expect(component.isLoading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No analytics events match');
  });

  it('applies trimmed filters only on search', () => {
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();
    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.filterForm.controls.eventType.setValue(' app.opened ');
    component.filterForm.controls.platform.setValue(' ios ');
    component.search();
    expect(service.getEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ eventType: 'app.opened', platform: 'ios', page: 0 }),
    );
  });

  it('resets filters and reloads page zero', () => {
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();
    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.filterForm.controls.eventType.setValue('app.opened');
    component.reset();
    expect(component.filterForm.controls.eventType.value).toBe('');
    expect(service.getEvents).toHaveBeenLastCalledWith({
      page: 0,
      size: 25,
      sort: 'receivedAt,desc',
    });
  });

  it('prevents an invalid date range from submitting', () => {
    fixture.detectChanges();
    component.filterForm.patchValue({ from: '2026-08-02T12:00', to: '2026-08-01T12:00' });
    component.search();
    expect(service.getEvents).toHaveBeenCalledTimes(1);
    expect(component.filterForm.hasError('dateRange')).toBe(true);
  });

  it('shows a generic error and retries', () => {
    fixture.detectChanges();
    results.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load analytics events');
    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.retry();
    expect(service.getEvents).toHaveBeenCalledTimes(2);
  });

  it('moves to previous and next server pages', () => {
    fixture.detectChanges();
    results.next(
      emptyPage({ number: 1, totalElements: 75, totalPages: 3, first: false, last: false }),
    );
    results.complete();
    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.nextPage();
    expect(service.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    results.next(emptyPage({ number: 1, totalPages: 3, first: false, last: false }));
    results.complete();
    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.previousPage();
    expect(service.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }));
  });

  it('redirects unauthorized responses to login', () => {
    fixture.detectChanges();
    results.error(new HttpErrorResponse({ status: 401 }));
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('navigates to the selected event detail', () => {
    component.viewEvent('event-1');
    expect(router.navigate).toHaveBeenCalledWith(['/analytics/events', 'event-1']);
  });

  it('displays language and region columns', () => {
    fixture.detectChanges();
    results.next(
      emptyPage({
        content: [
          {
            id: 'event-1',
            appClientId: 'client-1',
            appClientName: 'AppCore',
            apiKeyId: 'key-1',
            apiKeyName: 'AppCore Live',
            eventType: 'app.opened',
            occurredAt: '2026-08-01T12:00:00Z',
            receivedAt: '2026-08-01T12:00:01Z',
            anonymousUserId: null,
            sessionId: null,
            platform: 'ios',
            appVersion: '1',
            language: 'fr',
            region: 'CA',
            subscriptionStatus: null,
            purchased: false,
            properties: null,
          },
        ],
        totalElements: 1,
      }),
    );
    results.complete();
    fixture.detectChanges();

    const headers = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('th')).map(
      (header) => header.textContent?.trim(),
    );
    expect(headers).toContain('Language');
    expect(headers).toContain('Region');
    expect(fixture.nativeElement.textContent).toContain('fr');
    expect(fixture.nativeElement.textContent).toContain('CA');
  });

  it('lists and filters client and application names represented in events', () => {
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();

    const clientOptions = Array.from<HTMLOptionElement>(
      fixture.nativeElement.querySelectorAll('select[formControlName="clientId"] option'),
    ).map((option) => option.textContent?.trim());
    expect(clientOptions).toEqual(['All clients', 'AppCore', 'Meal Master Plan']);
    const applicationOptions = Array.from<HTMLOptionElement>(
      fixture.nativeElement.querySelectorAll('select[formControlName="apiKeyName"] option'),
    ).map((option) => option.textContent?.trim());
    expect(applicationOptions).toEqual([
      'All applications',
      'AppCore Live',
      'Meal Master Live',
    ]);

    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.filterForm.controls.clientId.setValue('Meal Master Plan');
    component.filterForm.controls.apiKeyName.setValue('Meal Master Live');
    component.search();
    expect(service.getEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        clientId: 'Meal Master Plan',
        apiKeyName: 'Meal Master Live',
        page: 0,
      }),
    );
  });
});
