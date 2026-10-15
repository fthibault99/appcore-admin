import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AppStoreApplication } from '../../core/app-store/app-store-notification.models';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AppStoreApplicationsComponent } from './app-store-applications';

const application: AppStoreApplication = {
  id: 'app-1', applicationKey: 'collector', displayName: 'Collector',
  bundleId: 'com.example.collector', appAppleId: 123, enabled: false, ratingsEnabled: true,
  version: 7, createdAt: '2026-10-14T12:00:00Z', updatedAt: '2026-10-14T12:00:00Z',
};

describe('AppStoreApplicationsComponent ratings tracking', () => {
  let fixture: ComponentFixture<AppStoreApplicationsComponent>;
  let component: AppStoreApplicationsComponent;
  let service: {
    getApplications: ReturnType<typeof vi.fn>;
    createApplication: ReturnType<typeof vi.fn>;
    updateApplication: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      getApplications: vi.fn(() => of([application])),
      createApplication: vi.fn(() => of(application)),
      updateApplication: vi.fn(() => of(application)),
    };
    await TestBed.configureTestingModule({
      imports: [AppStoreApplicationsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAppStoreService, useValue: service },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn(() => of(undefined)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppStoreApplicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates applications with the selected ratings setting and resets it after saving', () => {
    expect(component.form.controls.ratingsEnabled.value).toBe(false);
    component.form.patchValue({
      applicationKey: 'new-app', displayName: 'New app', bundleId: 'com.example.new', appAppleId: 456,
    });
    const checkbox = fixture.nativeElement.querySelector('[formControlName="ratingsEnabled"]') as HTMLInputElement;
    checkbox.click();
    component.save();
    expect(service.createApplication).toHaveBeenCalledWith({
      applicationKey: 'new-app', displayName: 'New app', bundleId: 'com.example.new', appAppleId: 456,
      ratingsEnabled: true,
    });
    expect(component.form.controls.ratingsEnabled.value).toBe(false);
  });

  it.each([false, true])('saves ratingsEnabled=%s without changing the notification flag', (ratingsEnabled) => {
    component.edit({ ...application, ratingsEnabled: !ratingsEnabled });
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('[formControlName="ratingsEnabled"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(!ratingsEnabled);
    checkbox.click();
    component.save();
    expect(service.updateApplication).toHaveBeenCalledWith('app-1', {
      displayName: 'Collector', bundleId: 'com.example.collector', appAppleId: 123,
      enabled: false, ratingsEnabled, version: 7,
    });
  });

  it('keeps the saved ratings flag when only metadata changes', () => {
    component.edit(application);
    component.form.controls.displayName.setValue('Updated name');
    component.save();
    expect(service.updateApplication).toHaveBeenCalledWith('app-1', expect.objectContaining({
      displayName: 'Updated name', ratingsEnabled: true,
    }));
  });

  it('preserves the draft and saved card state when saving fails', () => {
    component.edit(application);
    component.form.controls.ratingsEnabled.setValue(false);
    service.updateApplication.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.save();
    fixture.detectChanges();
    expect(component.editing()?.id).toBe('app-1');
    expect(component.form.controls.ratingsEnabled.value).toBe(false);
    expect(component.applications()[0].ratingsEnabled).toBe(true);
    expect(component.errorMessage()).toBe('Unable to save the App Store application.');
    expect(component.isSaving()).toBe(false);
  });

  it('displays the saved tracking status on each application card', () => {
    expect(fixture.nativeElement.querySelector('article').textContent).toContain('Ratings trackingEnabled');
  });
});
