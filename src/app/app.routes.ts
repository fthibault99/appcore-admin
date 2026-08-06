import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { LoginComponent } from './features/login/login';
import { adminAuthGuard } from './core/authentication/admin-auth.guard';
import { AnalyticsEventsComponent } from './features/analytics-events/analytics-events';
import { AnalyticsEventDetailComponent } from './features/analytics-event-detail/analytics-event-detail';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminAuthGuard] },
  { path: 'analytics/events', component: AnalyticsEventsComponent, canActivate: [adminAuthGuard] },
  {
    path: 'analytics/events/:eventId',
    component: AnalyticsEventDetailComponent,
    canActivate: [adminAuthGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
