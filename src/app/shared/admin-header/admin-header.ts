import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import {
  AdminThemePreference,
  AdminThemeService,
} from '../../core/theme/admin-theme.service';

@Component({
  selector: 'app-admin-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-header.html',
  styleUrl: './admin-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHeaderComponent {
  private readonly authentication = inject(AdminAuthenticationService);
  private readonly router = inject(Router);
  readonly theme = inject(AdminThemeService);
  readonly isLoggingOut = signal(false);

  setTheme(event: Event): void {
    const preference = (event.target as HTMLSelectElement).value as AdminThemePreference;
    this.theme.setPreference(preference);
  }

  logout(): void {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    this.authentication
      .logout()
      .pipe(finalize(() => this.isLoggingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/login']),
        error: () => void this.router.navigate(['/login']),
      });
  }
}
