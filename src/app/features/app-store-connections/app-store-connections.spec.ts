import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AppStoreConnection } from '../../core/app-store/app-store-connection.models';
import { AppStoreConnectionsComponent } from './app-store-connections';

const row: AppStoreConnection = {
  subject: '11111111-1111-4111-8111-111111111111',
  clientId: 'asc-client',
  applicationIdentityId: '22222222-2222-4222-8222-222222222222',
  createdAt: '2026-10-16T12:00:00Z',
  allowlisted: false,
};

describe('AppStoreConnectionsComponent', () => {
  let fixture: ComponentFixture<AppStoreConnectionsComponent>;
  let service: { getConnections: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => undefined });
    service = { getConnections: vi.fn(() => of([row])) };
    await TestBed.configureTestingModule({
      imports: [AppStoreConnectionsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAppStoreService, useValue: service },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn(() => of(undefined)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppStoreConnectionsComponent);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('renders connection identities and distinguishes allowlisted subjects', () => {
    service.getConnections.mockReturnValue(
      of([row, { ...row, subject: 'other-subject', allowlisted: true }]),
    );
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.textContent).toContain(row.subject);
    expect(element.textContent).toContain(row.applicationIdentityId);
    expect(element.textContent).toContain(row.clientId);
    expect(element.querySelectorAll('.badge')[0].textContent).toBe('Not allowlisted');
    expect(element.querySelectorAll('.badge')[1].textContent).toBe('Allowlisted');
    expect(fixture.componentInstance.allowlistedCount()).toBe(1);
  });

  it('keeps loading and failure distinct from an empty result and supports retry', () => {
    const pending = new Subject<AppStoreConnection[]>();
    service.getConnections.mockReturnValue(pending);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading connections');
    expect(fixture.nativeElement.textContent).not.toContain('No non-revoked connections');
    fixture.componentInstance.load();
    expect(service.getConnections).toHaveBeenCalledTimes(1);
    pending.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No non-revoked connections');
    service.getConnections.mockReturnValue(of([]));
    (fixture.nativeElement.querySelector('.page-heading button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No non-revoked connections');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('warns when the endpoint is unavailable', () => {
    service.getConnections.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('backend endpoint is deployed');
    expect(fixture.nativeElement.textContent).not.toContain('No non-revoked connections');
  });

  for (const status of [401, 403]) {
    it(`returns to login on HTTP ${status}`, () => {
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      service.getConnections.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      fixture.detectChanges();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  }

  it('copies the exact subject from its row', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('tbody button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledWith(row.subject);
    expect(fixture.nativeElement.querySelector('.success')?.textContent).toContain(row.subject);
  });

  it('provides manual copy guidance if clipboard access is refused', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard);
    fixture.detectChanges();
    await fixture.componentInstance.copySubject(row.subject);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'manually',
    );
    expect(fixture.componentInstance.copyMessage()).toBeNull();
  });
});
