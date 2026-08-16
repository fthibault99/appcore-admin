import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { LoginComponent } from './features/login/login';
import { adminAuthGuard } from './core/authentication/admin-auth.guard';
import { AnalyticsEventsComponent } from './features/analytics-events/analytics-events';
import { AnalyticsEventDetailComponent } from './features/analytics-event-detail/analytics-event-detail';
import { RecipesComponent } from './features/recipes/recipes';
import { RecipeDetailComponent } from './features/recipe-detail/recipe-detail';
import { BarcodesComponent } from './features/barcodes/barcodes';
import { BarcodeDetailComponent } from './features/barcode-detail/barcode-detail';
import { OpenAIUsageComponent } from './features/openai-usage/openai-usage';
import { OpenAIUsageDetailComponent } from './features/openai-usage-detail/openai-usage-detail';
import { OpenAIPricesComponent } from './features/openai-prices/openai-prices';
import { DeepResearchComponent } from './features/deep-research/deep-research';
import { ChatComponent } from './features/chat/chat';
import { AppStoreNotificationsComponent } from './features/app-store-notifications/app-store-notifications';
import { AppStoreNotificationDetailComponent } from './features/app-store-notification-detail/app-store-notification-detail';
import { AppStoreApplicationsComponent } from './features/app-store-applications/app-store-applications';
import { VoiceInboxComponent } from './features/voice-inbox/voice-inbox';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminAuthGuard] },
  { path: 'analytics/events', component: AnalyticsEventsComponent, canActivate: [adminAuthGuard] },
  { path: 'app-store/notifications', component: AppStoreNotificationsComponent, canActivate: [adminAuthGuard] },
  { path: 'app-store/applications', component: AppStoreApplicationsComponent, canActivate: [adminAuthGuard] },
  {
    path: 'app-store/notifications/:notificationId',
    component: AppStoreNotificationDetailComponent,
    canActivate: [adminAuthGuard],
  },
  {
    path: 'analytics/events/:eventId',
    component: AnalyticsEventDetailComponent,
    canActivate: [adminAuthGuard],
  },
  { path: 'recipes', component: RecipesComponent, canActivate: [adminAuthGuard] },
  { path: 'recipes/:recipeId', component: RecipeDetailComponent, canActivate: [adminAuthGuard] },
  { path: 'barcodes', component: BarcodesComponent, canActivate: [adminAuthGuard] },
  { path: 'barcodes/:barcodeId', component: BarcodeDetailComponent, canActivate: [adminAuthGuard] },
  { path: 'openai/usage', component: OpenAIUsageComponent, canActivate: [adminAuthGuard] },
  { path: 'openai/usage/:usageId', component: OpenAIUsageDetailComponent, canActivate: [adminAuthGuard] },
  { path: 'openai/prices', component: OpenAIPricesComponent, canActivate: [adminAuthGuard] },
  { path: 'openai/deep-research', component: DeepResearchComponent, canActivate: [adminAuthGuard] },
  { path: 'openai/chat', component: ChatComponent, canActivate: [adminAuthGuard] },
  { path: 'openai/voice-inbox', component: VoiceInboxComponent, canActivate: [adminAuthGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
