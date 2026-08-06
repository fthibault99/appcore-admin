import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authenticationService = inject(AdminAuthenticationService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
  });

  submit(): void {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid || this.isLoading()) {
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);
    const { email, password } = this.loginForm.getRawValue();
    const loginRequest = this.authenticationService.login(email, password);
    this.loginForm.controls.password.reset();

    loginRequest
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/dashboard']),
        error: (error: unknown) => {
          this.errorMessage.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'Invalid email or password.'
              : 'Unable to connect to AppCore. Please try again.',
          );
        },
      });
  }
}
