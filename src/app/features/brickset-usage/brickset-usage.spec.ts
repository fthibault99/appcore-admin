import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AdminBricksetUsageDay } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { BricksetUsageComponent } from './brickset-usage';

describe('BricksetUsageComponent', () => {
  let fixture: ComponentFixture<BricksetUsageComponent>;
  let result: Subject<AdminBricksetUsageDay[]>;
  let service: { getUsage: ReturnType<typeof vi.fn>; syncUsage: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    result = new Subject<AdminBricksetUsageDay[]>();
    service = {
      getUsage: vi.fn(() => result.asObservable()),
      syncUsage: vi.fn(() => of({ daysSynchronized: 30 })),
    };
    await TestBed.configureTestingModule({
      imports: [BricksetUsageComponent],
      providers: [provideRouter([]), { provide: AdminBricksetService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(BricksetUsageComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('renders summary values and daily usage', () => {
    fixture.detectChanges();
    result.next([
      { date: '2026-08-25', count: 165, fetchedAt: '2026-08-25T05:15:00Z' },
      { date: '2026-08-24', count: 75, fetchedAt: '2026-08-25T05:15:00Z' },
    ]);
    result.complete();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(service.getUsage).toHaveBeenCalledWith(30);
    expect(text).toContain('240');
    expect(text).toContain('120');
    expect(text).toContain('165');
    expect(fixture.nativeElement.querySelectorAll('.usage-row')).toHaveLength(2);
  });

  it('shows an empty state', () => {
    fixture.detectChanges();
    result.next([]);
    result.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No Brickset usage has been synchronized yet.',
    );
  });

  it('redirects an expired session to login', () => {
    fixture.detectChanges();
    result.error(new HttpErrorResponse({ status: 401 }));
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('tests getKeyUsageStats and refreshes the displayed usage', () => {
    service.getUsage.mockReset();
    service.getUsage
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(
        of([{ date: '2026-08-25', count: 165, fetchedAt: '2026-08-25T15:50:00Z' }]),
      );
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.page-heading button');
    expect(button.disabled).toBe(false);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(service.syncUsage).toHaveBeenCalledOnce();
    expect(service.getUsage).toHaveBeenLastCalledWith(30);
    expect(fixture.nativeElement.textContent).toContain(
      'getKeyUsageStats succeeded: 30 days synchronized.',
    );
    expect(fixture.nativeElement.querySelectorAll('.usage-row')).toHaveLength(1);
  });
});
