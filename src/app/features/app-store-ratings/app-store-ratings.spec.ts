import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AppStoreRatings, AppStoreRatingsRefreshAccepted } from '../../core/app-store/app-store-ratings.models';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AppStoreRatingsComponent } from './app-store-ratings';

const ratings: AppStoreRatings = {
  applicationId: 'app-1', appStoreId: 123, applicationName: 'Collector',
  totalRatings: 104, averageRating: 4.038, collectedCountries: 3, supportedCountries: 175,
  oldestCollectedDate: '2026-10-12', newestCollectedDate: '2026-10-14',
  officialAppleWorldwideStatistic: false,
  countries: [
    { country: 'CA', ratingCount: 4, averageRating: 5, collectedDate: '2026-10-14', collectedAt: '2026-10-14T12:00:00Z' },
    { country: 'US', ratingCount: 100, averageRating: 4, collectedDate: '2026-10-12', collectedAt: '2026-10-12T12:00:00Z' },
    { country: 'DE', ratingCount: 0, averageRating: null, collectedDate: '2026-10-14', collectedAt: '2026-10-14T12:00:00Z' },
  ],
};

describe('AppStoreRatingsComponent', () => {
  let fixture: ComponentFixture<AppStoreRatingsComponent>;
  let component: AppStoreRatingsComponent;
  let service: { getRatings: ReturnType<typeof vi.fn>; refreshRatings: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = { getRatings: vi.fn(() => of([ratings])), refreshRatings: vi.fn(() => of({ runId: 'run-1', applicationId: 'app-1', country: null })) };
    await TestBed.configureTestingModule({
      imports: [AppStoreRatingsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAppStoreService, useValue: service },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn(() => of(undefined)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppStoreRatingsComponent);
    component = fixture.componentInstance;
  });

  it('uses the server weighted aggregate and sorts countries by count', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="total-ratings"]')?.textContent).toBe('104');
    expect(el.querySelector('[data-testid="average-rating"]')?.textContent).toBe('4.04');
    expect(component.countries().map(row => row.country)).toEqual(['US', 'CA', 'DE']);
    expect(el.textContent).toContain('United States');
    expect(el.textContent).toContain('3 / 175');
    expect(el.textContent).toContain('not an official Apple worldwide rating');
    expect(el.querySelectorAll('tbody tr')[2].textContent).toContain('—');
  });

  it('sorts using the selector without mutating the response', () => {
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('#ratings-sort') as HTMLSelectElement;
    select.value = 'average';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.countries().map(row => row.country)).toEqual(['CA', 'US', 'DE']);
    expect(ratings.countries.map(row => row.country)).toEqual(['CA', 'US', 'DE']);
    select.value = 'country';
    select.dispatchEvent(new Event('change'));
    expect(component.countries().map(row => row.country)).toEqual(['CA', 'DE', 'US']);
  });

  it('preserves the application selection when reloading saved data', () => {
    const other = { ...ratings, applicationId: 'app-2', applicationName: 'Another app', totalRatings: 20 };
    service.getRatings.mockReturnValue(of([ratings, other]));
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('#ratings-application') as HTMLSelectElement;
    select.value = 'app-2';
    select.dispatchEvent(new Event('change'));
    component.load();
    fixture.detectChanges();
    expect(component.selected()?.applicationId).toBe('app-2');
    expect(fixture.nativeElement.querySelector('[data-testid="total-ratings"]').textContent).toBe('20');
    service.getRatings.mockReturnValue(of([ratings]));
    component.load();
    expect(component.selected()?.applicationId).toBe('app-1');
  });

  it('distinguishes no observations from a measured zero count', () => {
    service.getRatings.mockReturnValue(of([{ ...ratings, totalRatings: 0, averageRating: null, countries: [] }]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="average-rating"]').textContent).toBe('—');
    expect(fixture.nativeElement.textContent).toContain('No country observations');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('does not show an empty result while loading or after failure', () => {
    const pending = new Subject<AppStoreRatings[]>();
    service.getRatings.mockReturnValue(pending);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading ratings');
    expect(fixture.nativeElement.textContent).not.toContain('No applications');
    pending.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No applications');
    service.getRatings.mockReturnValue(of([]));
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No applications are being tracked');
  });

  it('marks previously loaded data as stale after a reload failure', () => {
    fixture.detectChanges();
    service.getRatings.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('has not been updated');
    expect(component.selected()?.totalRatings).toBe(104);
  });

  it('requests the selected application once while pending and reports acceptance', () => {
    const pending = new Subject<AppStoreRatingsRefreshAccepted>();
    service.refreshRatings.mockReturnValue(pending);
    service.getRatings.mockReturnValue(of([ratings, { ...ratings, applicationId: 'app-2', applicationName: 'Second app' }]));
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('#ratings-application') as HTMLSelectElement;
    select.value = 'app-2';
    select.dispatchEvent(new Event('change'));
    const button = fixture.nativeElement.querySelector('.collect-button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    component.collectRatings();
    expect(service.refreshRatings).toHaveBeenCalledExactlyOnceWith('app-2');
    expect(button.disabled).toBe(true);
    expect(select.disabled).toBe(true);
    expect(component.collectionMessage()).toBeNull();
    pending.next({ runId: 'run-1', applicationId: 'app-2', country: null });
    pending.complete();
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Collection request accepted for Second app');
    expect(component.collectionMessage()).toContain('background');
    expect(service.getRatings).toHaveBeenCalledTimes(1);
    select.value = 'app-1';
    select.dispatchEvent(new Event('change'));
    expect(component.collectionMessage()).toBeNull();
  });

  it('does not submit a collection without a selected application', () => {
    service.getRatings.mockReturnValue(of([]));
    fixture.detectChanges();
    component.collectRatings();
    expect(service.refreshRatings).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.collect-button').disabled).toBe(true);
  });

  it.each([409, 500])('reports collection failure %s without claiming acceptance', status => {
    fixture.detectChanges();
    service.refreshRatings.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    component.collectRatings();
    fixture.detectChanges();
    expect(component.collectionMessage()).toBeNull();
    expect(component.isRequestingCollection()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      status === 409 ? 'already running' : 'Unable to request collection',
    );
    expect(component.selected()?.totalRatings).toBe(104);
  });

  it('returns expired sessions to login when collecting', () => {
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.refreshRatings.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.collectRatings();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(component.collectionMessage()).toBeNull();
  });

  it('returns expired sessions to login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.getRatings.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
