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
  let service: {
    getConnections: ReturnType<typeof vi.fn>;
    generateReconnectCode: ReturnType<typeof vi.fn>;
  };
  beforeEach(async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => undefined });
    service = {
      getConnections: vi.fn(() => of([row])),
      generateReconnectCode: vi.fn(() =>
        of({ code: '583214', expiresAt: new Date(Date.now() + 600_000).toISOString() }),
      ),
    };
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
    vi.useRealTimers();
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

  it('offers reconnection only for authorized rows and blocks concurrent generation', () => {
    const allowed = { ...row, subject: 'allowed-subject', allowlisted: true };
    service.getConnections.mockReturnValue(of([row, allowed]));
    const pending = new Subject<{ code: string; expiresAt: string }>();
    service.generateReconnectCode.mockReturnValue(pending);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.reconnect')).toHaveLength(1);
    fixture.componentInstance.generateReconnectCode(row);
    expect(service.generateReconnectCode).not.toHaveBeenCalled();
    (fixture.nativeElement.querySelector('.reconnect') as HTMLButtonElement).click();
    fixture.componentInstance.generateReconnectCode(allowed);
    expect(service.generateReconnectCode).toHaveBeenCalledExactlyOnceWith('allowed-subject');
    pending.next({ code: '583214', expiresAt: new Date(Date.now() + 600_000).toISOString() });
    pending.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pairing-code').textContent).toContain('583214');
  });

  it('copies the reconnection code without repeating it in feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard);
    fixture.detectChanges();
    fixture.componentInstance.generateReconnectCode({ ...row, allowlisted: true });
    await fixture.componentInstance.copyPairingCode();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledWith('583214');
    expect(fixture.nativeElement.querySelector('.success')?.textContent).toBe(
      'Reconnection code copied.',
    );
  });

  it('removes an expired code and prevents copying it', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard);
    fixture.detectChanges();
    fixture.componentInstance.generateReconnectCode({ ...row, allowlisted: true });
    vi.advanceTimersByTime(600_000);
    await fixture.componentInstance.copyPairingCode();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pairing-code')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('The code has expired');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('clears a previous code on retry and gives a useful error without exposing it', () => {
    fixture.detectChanges();
    const allowed = { ...row, allowlisted: true };
    fixture.componentInstance.generateReconnectCode(allowed);
    expect(fixture.componentInstance.pairingCode()).not.toBeNull();
    service.generateReconnectCode.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    fixture.componentInstance.generateReconnectCode(allowed);
    fixture.detectChanges();
    expect(fixture.componentInstance.pairingCode()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('no longer authorized');
    expect(fixture.nativeElement.textContent).not.toContain('583214');
  });
});
