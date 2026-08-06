export type AnalyticsEventProperties = Record<string, unknown> | unknown[] | null;

export interface AnalyticsEventSummary {
  id: string;
  appClientId: string;
  apiKeyId: string;
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  anonymousUserId: string | null;
  sessionId: string | null;
  platform: string | null;
  appVersion: string | null;
  language: string | null;
  region: string | null;
  subscriptionStatus: string | null;
  purchased: boolean;
  properties: AnalyticsEventProperties;
}

export type AnalyticsEventDetail = AnalyticsEventSummary;

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AnalyticsEventFilters {
  eventType?: string;
  clientId?: string;
  platform?: string;
  appVersion?: string;
  anonymousUserId?: string;
  sessionId?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
  sort: string;
}
