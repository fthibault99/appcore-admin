import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminMealAgainService } from '../../core/mealagain/admin-mealagain.service';
import { MealAgainDetailComponent } from './mealagain-detail';
const id = '00000000-0000-0000-0000-000000000001';
const empty = { content: [], totalElements: 0, totalPages: 0, number: 0, first: true, last: true };
const detail = {
  account: { userId: id, createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z' },
  legacyLifetimeAccess: true,
  legacyManualLifetime: false,
  balances: ['PRODUCTION', 'SANDBOX', 'UNCLASSIFIED'].map((environment) => ({
    environment,
    freeRemaining: 3,
    purchasedRemaining: 10,
    lifetimeAccess: environment === 'SANDBOX',
    manualLifetime: false,
    balanceVersion: 0,
    resetAt: null,
    updatedAt: '2026-08-31T00:00:00Z',
  })),
};
describe('MealAgainDetailComponent', () => {
  const service = { getAccount: vi.fn(), getPurchases: vi.fn(), getUsages: vi.fn() };
  beforeEach(async () => {
    service.getAccount.mockReset().mockReturnValue(of(detail));
    service.getPurchases.mockReset().mockReturnValue(of(empty));
    service.getUsages.mockReset().mockReturnValue(of(empty));
    await TestBed.configureTestingModule({
      imports: [MealAgainDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ userId: id })) } },
        { provide: AdminAuthenticationService, useValue: {} },
        { provide: AdminMealAgainService, useValue: service },
      ],
    }).compileComponents();
  });
  it('shows all environment balances without treating historical flags as current access', () => {
    const fixture = TestBed.createComponent(MealAgainDetailComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.balance');
    expect(cards.length).toBe(3);
    expect(cards[0].textContent).toContain('Disabled');
    expect(cards[1].textContent).toContain('Enabled');
    expect(cards[2].textContent).toContain('These rights are not available to the app');
    expect(fixture.nativeElement.textContent).toContain('audit only');
  });
  it('cancels outdated history when filtering and switching to consumptions', () => {
    const pending = new Subject<any>();
    service.getPurchases.mockReturnValue(pending);
    const fixture = TestBed.createComponent(MealAgainDetailComponent);
    fixture.detectChanges();
    fixture.componentInstance.selectEnvironment({
      target: { value: 'UNCLASSIFIED' },
    } as unknown as Event);
    expect(service.getPurchases).toHaveBeenLastCalledWith(id, 'UNCLASSIFIED', 0);
    fixture.componentInstance.selectHistory('usages');
    fixture.detectChanges();
    expect(pending.observers.length).toBe(0);
    expect(service.getUsages).toHaveBeenCalledWith(id, 'UNCLASSIFIED', 0);
    expect(fixture.nativeElement.textContent).toContain('No records for this environment.');
  });
  it('handles missing accounts and history failure separately', () => {
    service.getPurchases.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(MealAgainDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load history.');
    expect(fixture.nativeElement.textContent).toContain(id);
    service.getAccount.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('MealAgain account not found.');
    expect(fixture.nativeElement.querySelector('.balance')).toBeNull();
  });
});
