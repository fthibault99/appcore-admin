import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAppStoreService } from '../../core/app-store/admin-app-store.service';
import { AppStoreApplication } from '../../core/app-store/app-store-notification.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-store-applications',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './app-store-applications.html',
  styleUrl: './app-store-applications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStoreApplicationsComponent implements OnInit {
  private readonly service = inject(AdminAppStoreService);
  private readonly router = inject(Router);

  readonly applications = signal<AppStoreApplication[]>([]);
  readonly editing = signal<AppStoreApplication | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly copiedUrl = signal<string | null>(null);
  readonly copyError = signal(false);
  readonly form = new FormGroup({
    applicationKey: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    }),
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    bundleId: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    appAppleId: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    enabled: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  edit(application: AppStoreApplication): void {
    this.editing.set(application);
    this.errorMessage.set(null);
    this.form.setValue({
      applicationKey: application.applicationKey,
      displayName: application.displayName,
      bundleId: application.bundleId,
      appAppleId: application.appAppleId,
      enabled: application.enabled,
    });
    this.form.controls.applicationKey.disable();
  }

  cancel(): void {
    this.editing.set(null);
    this.form.controls.applicationKey.enable();
    this.form.reset({ applicationKey: '', displayName: '', bundleId: '', appAppleId: null, enabled: true });
    this.errorMessage.set(null);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving()) return;
    const value = this.form.getRawValue();
    const current = this.editing();
    this.errorMessage.set(null);
    this.isSaving.set(true);
    const operation = current
      ? this.service.updateApplication(current.id, {
          displayName: value.displayName.trim(),
          bundleId: value.bundleId.trim(),
          appAppleId: value.appAppleId!,
          enabled: value.enabled,
          version: current.version,
        })
      : this.service.createApplication({
          applicationKey: value.applicationKey.trim(),
          displayName: value.displayName.trim(),
          bundleId: value.bundleId.trim(),
          appAppleId: value.appAppleId!,
        });
    operation.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => { this.cancel(); this.load(); },
      error: (error: unknown) => this.handleError(error, 'Unable to save the App Store application.'),
    });
  }

  appStoreUrl(applicationKey: string, target: 'production' | 'sandbox'): string {
    return `${environment.apiBaseUrl}/api/webhooks/apple/app-store/${encodeURIComponent(applicationKey)}/${target}`;
  }

  async copyUrl(url: string): Promise<void> {
    this.copyError.set(false);
    try {
      await navigator.clipboard.writeText(url);
      this.copiedUrl.set(url);
      window.setTimeout(() => {
        if (this.copiedUrl() === url) this.copiedUrl.set(null);
      }, 2000);
    } catch {
      this.copiedUrl.set(null);
      this.copyError.set(true);
    }
  }

  private load(): void {
    this.isLoading.set(true);
    this.service.getApplications().pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (applications) => this.applications.set(applications),
      error: (error: unknown) => this.handleError(error, 'Unable to load App Store applications.'),
    });
  }

  private handleError(error: unknown, fallback: string): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      void this.router.navigate(['/login']);
      return;
    }
    this.errorMessage.set(error instanceof HttpErrorResponse && error.status === 409
      ? 'The application key, bundle ID, or App Apple ID is already in use, or the record changed.'
      : fallback);
  }
}
