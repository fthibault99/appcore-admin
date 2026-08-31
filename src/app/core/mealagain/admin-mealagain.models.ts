export type MealAgainEnvironment = 'PRODUCTION' | 'SANDBOX' | 'UNCLASSIFIED';
export interface MealAgainPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
}
export interface MealAgainAccount {
  userId: string;
  createdAt: string;
  updatedAt: string;
}
export interface MealAgainBalance {
  environment: MealAgainEnvironment;
  freeRemaining: number;
  purchasedRemaining: number;
  lifetimeAccess: boolean;
  manualLifetime: boolean;
  balanceVersion: number;
  resetAt: string | null;
  updatedAt: string;
}
export interface MealAgainAccountDetail {
  account: MealAgainAccount;
  legacyLifetimeAccess: boolean;
  legacyManualLifetime: boolean;
  balances: MealAgainBalance[];
}
export interface MealAgainPurchase {
  id: string;
  environment: MealAgainEnvironment;
  transactionId: string;
  productId: string;
  creditsGranted: number;
  revoked: boolean;
  purchasedAt: string | null;
  createdAt: string;
}
export interface MealAgainUsage {
  id: string;
  environment: MealAgainEnvironment;
  recreationId: string | null;
  creditSource: 'FREE' | 'PURCHASED' | 'LIFETIME';
  createdAt: string;
}
