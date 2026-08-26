import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, InjectionToken, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type AdminThemePreference = 'system' | 'light' | 'dark';
type ResolvedAdminTheme = Exclude<AdminThemePreference, 'system'>;

const STORAGE_KEY = 'appcore-admin-theme';

export const ADMIN_THEME_STORAGE = new InjectionToken<Storage | undefined>('ADMIN_THEME_STORAGE', {
  providedIn: 'root',
  factory: () => {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return undefined;
    try {
      return typeof window.localStorage?.getItem === 'function' ? window.localStorage : undefined;
    } catch {
      return undefined;
    }
  },
});

@Injectable({ providedIn: 'root' })
export class AdminThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(ADMIN_THEME_STORAGE);
  private readonly mediaQuery = isPlatformBrowser(this.platformId) && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : undefined;
  private readonly systemTheme = signal<ResolvedAdminTheme>(
    this.mediaQuery?.matches ? 'dark' : 'light',
  );

  readonly preference = signal<AdminThemePreference>(this.readPreference());
  readonly resolvedTheme = computed<ResolvedAdminTheme>(() => {
    const preference = this.preference();
    return preference === 'system' ? this.systemTheme() : preference;
  });

  constructor() {
    this.applyTheme();
    this.mediaQuery?.addEventListener('change', this.handleSystemThemeChange);
  }

  setPreference(preference: AdminThemePreference): void {
    this.preference.set(preference);
    try {
      this.storage?.setItem(STORAGE_KEY, preference);
    } catch {
      // The selected theme still applies when browser storage is unavailable.
    }
    this.applyTheme();
  }

  private readonly handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    this.systemTheme.set(event.matches ? 'dark' : 'light');
    if (this.preference() === 'system') {
      this.applyTheme();
    }
  };

  private readPreference(): AdminThemePreference {
    try {
      const storedPreference = this.storage?.getItem(STORAGE_KEY);
      return storedPreference === 'light' || storedPreference === 'dark' ? storedPreference : 'system';
    } catch {
      return 'system';
    }
  }

  private applyTheme(): void {
    const root = this.document.documentElement;
    root.dataset['theme'] = this.resolvedTheme();
    root.dataset['themePreference'] = this.preference();
    root.style.colorScheme = this.resolvedTheme();
  }
}
