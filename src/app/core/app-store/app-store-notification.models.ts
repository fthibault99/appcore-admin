export interface AppStoreNotificationSummary {
  id: string;
  applicationKey: string | null;
  applicationName: string | null;
  notificationUuid: string;
  environment: string;
  notificationType: string;
  subtype: string | null;
  bundleId: string;
  transactionId: string | null;
  originalTransactionId: string | null;
  productId: string | null;
  signedDate: string | null;
  purchaseDate: string | null;
  expiresDate: string | null;
  revocationDate: string | null;
  autoRenewStatus: number | null;
  consumptionRequestReason: string | null;
  receivedAt: string;
}

export interface AppStoreApplication {
  id: string;
  applicationKey: string;
  displayName: string;
  bundleId: string;
  appAppleId: number;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppStoreApplication {
  applicationKey: string;
  displayName: string;
  bundleId: string;
  appAppleId: number;
}

export interface UpdateAppStoreApplication {
  displayName: string;
  bundleId: string;
  appAppleId: number;
  enabled: boolean;
  version: number;
}

export interface AppStoreNotificationDetail {
  notification: AppStoreNotificationSummary;
  appAppleId: number | null;
  signedPayload: string;
  decodedPayload: Record<string, unknown>;
}

export interface AppStoreNotificationPage {
  content: AppStoreNotificationSummary[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AppStoreNotificationFilters {
  applicationKey?: string;
  environment?: string;
  notificationType?: string;
  page: number;
  size: number;
  sort: string;
}
