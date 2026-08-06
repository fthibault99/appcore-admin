export interface Dashboard {
  system: SystemStatus;
  today: TodayStatistics;
  recentActivity: RecentActivity[];
  recentErrors: RecentError[];
}

export interface SystemStatus {
  status: string;
  version: string;
  environment: string;
  uptime: number;
}

export interface TodayStatistics {
  analyticsEventsToday: number;
  recipeExtractionsToday: number;
  barcodeLookupsToday: number;
  openAiRequestsToday: number;
}

export interface RecentActivity {
  occurredAt: string;
  eventType: string;
  application: string;
  platform: string;
}

export interface RecentError {
  occurredAt: string;
  source: string;
  message: string;
  severity: string;
}
