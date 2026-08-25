import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminHeaderComponent } from './admin-header';

describe('AdminHeaderComponent', () => {
  it('renders all admin links and logs out', async () => {
    const authentication = { logout: vi.fn(() => of(undefined)) };
    await TestBed.configureTestingModule({
      imports: [AdminHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAuthenticationService, useValue: authentication },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminHeaderComponent);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>,
    );
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Dashboard',
      'Analytics',
      'App Store',
      'Recipes',
      'Extraction Domains',
      'Barcodes',
      'Brickset',
      'OpenAI',
      'Research',
      'Chat',
      'Voice Inbox',
      'Dish Recreation',
      'Recipe Discovery',
    ]);
    const brand = fixture.nativeElement.querySelector('.brand') as HTMLAnchorElement;
    expect(brand.textContent?.trim()).toBe('App Core Admin');
    expect((brand.querySelector('img') as HTMLImageElement).getAttribute('src')).toBe(
      '/assets/appcore-logo.png',
    );

    (fixture.nativeElement.querySelector('.logout') as HTMLButtonElement | null)?.click();
    expect(authentication.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
