import { TestBed } from '@angular/core/testing';
import { ADMIN_THEME_STORAGE, AdminThemeService } from './admin-theme.service';

describe('AdminThemeService', () => {
  let values: Map<string, string>;

  beforeEach(() => {
    values = new Map<string, string>();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ADMIN_THEME_STORAGE,
          useValue: {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => {
              values.set(key, value);
            },
          },
        },
      ],
    });
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
  });

  it('uses and applies the system preference by default', () => {
    const service = TestBed.inject(AdminThemeService);

    expect(service.preference()).toBe('system');
    expect(document.documentElement.dataset['theme']).toBe(service.resolvedTheme());
    expect(document.documentElement.dataset['themePreference']).toBe('system');
  });

  it('persists and applies an explicit dark preference', () => {
    const service = TestBed.inject(AdminThemeService);

    service.setPreference('dark');

    expect(service.preference()).toBe('dark');
    expect(service.resolvedTheme()).toBe('dark');
    expect(values.get('appcore-admin-theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
