import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { DashboardService } from '../../core/dashboard/dashboard.service';
import { Dashboard } from '../../models/dashboard.models';
import { DashboardComponent } from './dashboard';

@Component({ template: 'Recipes page' })
class RecipesTestComponent {}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let dashboardResult: Subject<Dashboard>;
  let dashboardService: { getDashboard: ReturnType<typeof vi.fn> };
  let authenticationService: { logout: ReturnType<typeof vi.fn> };
  let router: Router;

  const dashboard: Dashboard = {
    system: { status: 'UP', version: '0.4.0', environment: 'production', uptime: 3660 },
    today: {
      analyticsEventsToday: 12,
      recipeExtractionsToday: 0,
      barcodeLookupsToday: 0,
      openAiRequestsToday: 0,
    },
    recentActivity: [
      {
        occurredAt: '2026-08-05T18:00:00Z',
        eventType: 'app.opened',
        application: 'BrickCollector',
        platform: 'ios',
      },
    ],
    recentErrors: [],
  };

  beforeEach(async () => {
    dashboardResult = new Subject<Dashboard>();
    dashboardService = { getDashboard: vi.fn(() => dashboardResult.asObservable()) };
    authenticationService = { logout: vi.fn(() => of(undefined)) };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([{ path: 'recipes', component: RecipesTestComponent }]),
        { provide: DashboardService, useValue: dashboardService },
        { provide: AdminAuthenticationService, useValue: authenticationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('loads and renders the aggregated dashboard', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBe(true);
    expect(dashboardService.getDashboard).toHaveBeenCalledTimes(1);

    dashboardResult.next(dashboard);
    dashboardResult.complete();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('AppCore Status');
    expect(text).toContain('production');
    expect(text).toContain('1h 1m');
    expect(text).toContain('app.opened');
    expect(text).toContain('No recent errors');
  });

  it('shows an error and retries the dashboard request', () => {
    fixture.detectChanges();
    dashboardResult.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load data.');

    dashboardResult = new Subject<Dashboard>();
    dashboardService.getDashboard.mockImplementation(() => dashboardResult.asObservable());
    component.retry();
    expect(dashboardService.getDashboard).toHaveBeenCalledTimes(2);
  });

  it('redirects an expired admin session to login', () => {
    fixture.detectChanges();
    dashboardResult.error(new HttpErrorResponse({ status: 401 }));
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('navigates to recipes from the services card', async () => {
    fixture.detectChanges();
    dashboardResult.next(dashboard);
    dashboardResult.complete();
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll(
      '.service-card',
    ) as NodeListOf<HTMLAnchorElement>;
    const recipesLink = Array.from(links).find((link) => link.textContent?.includes('Recipes'));

    expect(recipesLink?.getAttribute('href')).toBe('/recipes');
    recipesLink?.click();
    await fixture.whenStable();

    expect(router.url).toBe('/recipes');
  });
});
