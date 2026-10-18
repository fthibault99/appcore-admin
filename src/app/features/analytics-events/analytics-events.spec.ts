import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { AdminAnalyticsService } from '../../core/analytics/admin-analytics.service';
import { AnalyticsEventSummary, PageResponse } from '../../core/analytics/analytics-event.models';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AnalyticsEventsComponent } from './analytics-events';

const createStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

describe('AnalyticsEventsComponent', () => {
  let fixture: ComponentFixture<AnalyticsEventsComponent>;
  let component: AnalyticsEventsComponent;
  let results: Subject<PageResponse<AnalyticsEventSummary>>;
  let service: {
    getStatistics: ReturnType<typeof vi.fn>;
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

  const defaultFrom = new Date(2026, 8, 18).toISOString();

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 18, 14, 30));
    sessionStorage.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorage(),
    });
    results = new Subject();
    service = {
      getStatistics: vi.fn(() =>
        of({
          totals: {
            events: 12,
            users: 3,
            sessions: 5,
            eventsWithoutUser: 2,
            eventsWithoutSession: 1,
          },
          byApplication: [
            { key: 'key-1', label: 'AppCore Live', counts: { events: 12, users: 3, sessions: 5 } },
          ],
          byRegion: [{ key: null, label: null, counts: { events: 2, users: 1, sessions: 1 } }],
          byLanguage: [{ key: 'fr', label: 'fr', counts: { events: 10, users: 2, sessions: 4 } }],
        }),
      ),
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

  afterEach(() => vi.useRealTimers());

  it('defaults to one calendar month ago at local midnight for events and statistics', () => {
    fixture.detectChanges();
    expect(component.filterForm.controls.from.value).toBe('2026-09-18T00:00');
    expect(component.filterForm.controls.to.value).toBe('');
    expect(service.getEvents).toHaveBeenCalledWith(expect.objectContaining({ from: defaultFrom }));
    expect(service.getStatistics).toHaveBeenCalledWith(
      expect.objectContaining({ from: defaultFrom }),
    );
  });

  it.each([
    [new Date(2026, 2, 31, 12), '2026-02-28T00:00'],
    [new Date(2028, 2, 31, 12), '2028-02-29T00:00'],
    [new Date(2026, 0, 18, 12), '2025-12-18T00:00'],
  ])('clamps the default start date to the previous calendar month for %s', (today, expected) => {
    vi.setSystemTime(today);
    fixture.detectChanges();
    expect(component.filterForm.controls.from.value).toBe(expected);
    expect(service.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: new Date(expected).toISOString() }),
    );
  });

  it('allows an explicitly empty start date to be restored', () => {
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();
    component.filterForm.controls.from.setValue('');
    component.search();
    fixture.destroy();
    fixture = TestBed.createComponent(AnalyticsEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.filterForm.controls.from.value).toBe('');
    expect(service.getEvents.mock.lastCall?.[0].from).toBeUndefined();
  });

  it('renders distinct statistics, missing data, and all three breakdowns', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Anonymous users');
    expect(text).toContain('2 events without a user ID');
    expect(text).toContain('Not provided');
    expect(text).toContain('By application');
    expect(text).toContain('By region');
    expect(text).toContain('By language');
    expect(service.getStatistics).toHaveBeenCalledTimes(1);
  });

  it('passes applied language and region filters to statistics and resets them', () => {
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();
    component.filterForm.patchValue({ language: ' fr ', region: ' CA ' });
    component.search();
    expect(service.getStatistics).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: 'fr', region: 'CA' }),
    );
    component.reset();
    expect(service.getStatistics).toHaveBeenLastCalledWith({
      page: 0,
      size: 25,
      sort: 'receivedAt,desc',
      from: defaultFrom,
    });
  });

  it('shows statistics failures and clears stale values', () => {
    fixture.detectChanges();
    const pending = new Subject();
    service.getStatistics.mockReturnValue(pending);
    component.loadStatistics();
    expect(component.statistics()).toBeNull();
    pending.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load statistics');
  });

  it('loads the first page and exposes loading and empty states', () => {
    fixture.detectChanges();
    expect(service.getEvents).toHaveBeenCalledWith({
      page: 0,
      size: 25,
      sort: 'receivedAt,desc',
      from: defaultFrom,
    });
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
      from: defaultFrom,
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

  it('orders application before event type and displays the info property', () => {
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
            properties: { info: 'Opened from widget' },
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
    expect(headers.indexOf('Application')).toBeLessThan(headers.indexOf('Event type'));
    expect(headers.indexOf('Info')).toBe(headers.indexOf('Event type') + 1);
    expect(headers).not.toContain('Occurred');
    expect(headers).not.toContain('Client Name');
    expect(fixture.nativeElement.textContent).toContain('fr');
    expect(fixture.nativeElement.textContent).toContain('CA');
    expect(fixture.nativeElement.textContent).toContain('Opened from widget');
  });

  it('uses a dash when the info property is absent', () => {
    expect(component.propertyInfo({ source: 'widget' })).toBe('—');
    expect(component.propertyInfo(null)).toBe('—');
  });

  it('limits the displayed info value to 20 characters', () => {
    expect(component.propertyInfoPreview({ info: '12345678901234567890extra' })).toBe(
      '12345678901234567890',
    );
    expect(component.propertyInfo({ info: '12345678901234567890extra' })).toBe(
      '12345678901234567890extra',
    );
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
    expect(applicationOptions).toEqual(['All applications', 'AppCore Live', 'Meal Master Live']);

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

  it('restores filters and pagination for the browser session', () => {
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();

    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.filterForm.patchValue({
      eventType: 'app.opened',
      clientId: 'Meal Master Plan',
      from: '2026-08-01T08:30',
    });
    component.search();
    results.next(emptyPage({ totalElements: 60, totalPages: 3, first: false, last: false }));
    results.complete();

    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.nextPage();
    fixture.destroy();

    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    fixture = TestBed.createComponent(AnalyticsEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.filterForm.getRawValue()).toEqual(
      expect.objectContaining({
        eventType: 'app.opened',
        clientId: 'Meal Master Plan',
        from: '2026-08-01T08:30',
      }),
    );
    expect(service.getEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventType: 'app.opened',
        clientId: 'Meal Master Plan',
        from: new Date('2026-08-01T08:30').toISOString(),
        page: 1,
      }),
    );
  });

  it('saves, restores, applies, and deletes named filters', () => {
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();

    component.filterForm.patchValue({
      eventType: 'app.opened',
      apiKeyName: 'Meal Master Live',
      platform: 'ios',
    });
    component.savedFilterName.setValue('Meal Master iOS');
    component.saveCurrentFilter();

    expect(component.savedFilters().map((filter) => filter.name)).toEqual(['Meal Master iOS']);
    fixture.destroy();

    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    fixture = TestBed.createComponent(AnalyticsEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    results.next(emptyPage());
    results.complete();

    expect(component.savedFilters().map((filter) => filter.name)).toEqual(['Meal Master iOS']);
    component.filterForm.reset();
    component.selectedSavedFilter.set('Meal Master iOS');
    results = new Subject();
    service.getEvents.mockImplementation(() => results.asObservable());
    component.applySavedFilter();

    expect(component.filterForm.getRawValue()).toEqual(
      expect.objectContaining({
        eventType: 'app.opened',
        apiKeyName: 'Meal Master Live',
        platform: 'ios',
      }),
    );
    expect(service.getEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventType: 'app.opened',
        apiKeyName: 'Meal Master Live',
        platform: 'ios',
        page: 0,
      }),
    );

    component.deleteSavedFilter();
    expect(component.savedFilters()).toEqual([]);
    expect(window.localStorage.getItem('appcore-admin.analytics-events.saved-filters')).toBe('[]');
  });
});
