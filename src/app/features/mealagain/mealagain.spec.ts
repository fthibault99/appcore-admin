import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminMealAgainService } from '../../core/mealagain/admin-mealagain.service';
import { MealAgainComponent } from './mealagain';

const empty = { content: [], totalElements: 0, totalPages: 0, number: 0, first: true, last: true };
describe('MealAgainComponent', () => {
  const service = { getAccounts: vi.fn() };
  beforeEach(async () => {
    service.getAccounts.mockReset().mockReturnValue(of(empty));
    await TestBed.configureTestingModule({
      imports: [MealAgainComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAuthenticationService, useValue: {} },
        { provide: AdminMealAgainService, useValue: service },
      ],
    }).compileComponents();
  });
  it('shows empty state and rejects malformed UUIDs before calling the server', () => {
    const fixture = TestBed.createComponent(MealAgainComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No MealAgain account found.');
    fixture.componentInstance.userId.setValue('bad');
    fixture.componentInstance.search();
    fixture.detectChanges();
    expect(service.getAccounts).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Enter a complete user UUID.');
  });
  it('submits the UUID through the actual form without navigating away, and resets the filter', () => {
    const fixture = TestBed.createComponent(MealAgainComponent);
    fixture.detectChanges();
    const id = '00000000-0000-0000-0000-000000000001';
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = `  ${id}  `;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('form').dispatchEvent(submit);
    fixture.detectChanges();
    expect(service.getAccounts).toHaveBeenLastCalledWith(id, 0);
    expect(submit.defaultPrevented).toBe(true);
    fixture.nativeElement.querySelector('form button[type="button"]').click();
    fixture.detectChanges();
    expect(service.getAccounts).toHaveBeenLastCalledWith('', 0);
    expect(input.value).toBe('');
  });
  it('shows loading, account link, and stable pagination', () => {
    const result = new Subject<any>();
    service.getAccounts.mockReturnValue(result);
    const fixture = TestBed.createComponent(MealAgainComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading MealAgain accounts');
    const id = '00000000-0000-0000-0000-000000000001';
    result.next({
      ...empty,
      content: [
        { userId: id, createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z' },
      ],
      totalPages: 2,
      totalElements: 26,
      last: false,
    });
    result.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(`a[href="/mealagain/${id}"]`)).not.toBeNull();
    fixture.componentInstance.next();
    expect(service.getAccounts).toHaveBeenLastCalledWith('', 1);
  });
  it('redirects expired sessions instead of displaying a fake empty list', () => {
    const result = new Subject<any>();
    service.getAccounts.mockReturnValue(result);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(MealAgainComponent);
    fixture.detectChanges();
    result.error(new HttpErrorResponse({ status: 401 }));
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
