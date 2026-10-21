export interface AppStoreConnection {
  subject: string;
  clientId: string;
  applicationIdentityId: string;
  createdAt: string;
  allowlisted: boolean;
}

export interface AppStorePairingCode {
  code: string;
  expiresAt: string;
}
