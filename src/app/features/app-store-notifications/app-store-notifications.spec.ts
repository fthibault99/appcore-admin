import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AppStoreNotificationsComponent } from './app-store-notifications';

describe('AppStoreNotificationsComponent', () => {
  let fixture: ComponentFixture<AppStoreNotificationsComponent>;
  let component: AppStoreNotificationsComponent;
  let service: {
    getApplications: ReturnType<typeof vi.fn>;
    getNotificationTypes: ReturnType<typeof vi.fn>;
    getNotifications: ReturnType<typeof vi.fn>;
  };

  const emptyPage = {
    content: [], number: 0, size: 50, totalElements: 0, totalPages: 0, first: true, last: true,
  };

  beforeEach(async () => {
    service = {
      getApplications: vi.fn(() => of([])),
      getNotificationTypes: vi.fn(() => of([])),
      getNotifications: vi.fn(() => of(emptyPage)),
    };

    await TestBed.configureTestingModule({
      imports: [AppStoreNotificationsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAppStoreService, useValue: service },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn(() => of(undefined)) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppStoreNotificationsComponent);
    component = fixture.componentInstance;
  });

  it('loads production notifications by default', () => {
    fixture.detectChanges();

    expect(component.filterForm.controls.environment.value).toBe('Production');
    expect(service.getNotifications).toHaveBeenCalledWith({
      environment: 'Production', page: 0, size: 50, sort: 'receivedAt,desc',
    });
  });

  it('restores production when filters are reset', () => {
    fixture.detectChanges();
    component.filterForm.patchValue({ environment: 'Sandbox', notificationType: 'TEST' });

    component.reset();

    expect(component.filterForm.controls.environment.value).toBe('Production');
    expect(service.getNotifications).toHaveBeenLastCalledWith({
      environment: 'Production', page: 0, size: 50, sort: 'receivedAt,desc',
    });
  });
});
