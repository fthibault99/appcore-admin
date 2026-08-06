import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let loginResult: Subject<void>;
  let authenticationService: { login: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    loginResult = new Subject<void>();
    authenticationService = {
      login: vi.fn((): Observable<void> => loginResult.asObservable()),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AdminAuthenticationService, useValue: authenticationService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function enterValidCredentials(): void {
    component.loginForm.setValue({ email: 'admin@example.com', password: 'secret' });
    fixture.detectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  it('starts with an invalid form', () => {
    const logo = fixture.nativeElement.querySelector('.login-logo') as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('/assets/appcore-logo.png');
    expect(fixture.nativeElement.querySelector('#login-title')?.textContent).toContain(
      'App Core Admin',
    );
    expect(component.loginForm.invalid).toBe(true);
    expect(submitButton().disabled).toBe(true);
  });

  it('enables submission for a valid email and password', () => {
    enterValidCredentials();
    expect(component.loginForm.valid).toBe(true);
    expect(submitButton().disabled).toBe(false);
  });

  it('shows validation for an invalid email', () => {
    component.loginForm.controls.email.setValue('not-an-email');
    component.loginForm.controls.email.markAsTouched();
    component.loginForm.controls.password.setValue('secret');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#email-error')?.textContent).toContain(
      'Enter a valid email address.',
    );
  });

  it('navigates to the dashboard after a successful login', () => {
    enterValidCredentials();
    component.submit();
    loginResult.next();
    loginResult.complete();

    expect(authenticationService.login).toHaveBeenCalledWith('admin@example.com', 'secret');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isLoading()).toBe(false);
  });

  it('shows the invalid credentials message for HTTP 401', () => {
    enterValidCredentials();
    component.submit();
    loginResult.error(new HttpErrorResponse({ status: 401 }));

    expect(component.errorMessage()).toBe('Invalid email or password.');
    expect(component.isLoading()).toBe(false);
  });

  it('shows the connection message for other errors', () => {
    enterValidCredentials();
    component.submit();
    loginResult.error(new HttpErrorResponse({ status: 500 }));

    expect(component.errorMessage()).toBe('Unable to connect to AppCore. Please try again.');
    expect(component.isLoading()).toBe(false);
  });

  it('disables the submit button while login is in progress', () => {
    enterValidCredentials();
    component.submit();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(true);
    expect(submitButton().disabled).toBe(true);
  });
});
