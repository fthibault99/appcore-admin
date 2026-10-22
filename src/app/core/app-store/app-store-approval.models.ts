export interface AppStoreNotesRequest {
  tool: "update_app_metadata";
  arguments: {
    appId: string;
    version: string;
    locale: string;
    metadata: { whatsNew: string };
  };
}

export interface AppStoreApprovalPreview {
  planHash: string;
  plan: {
    appId: string;
    versionId: string;
    platform: string;
    state: string;
    snapshot: {
      current: {
        name: string;
        version: string;
        locale: string;
        whatsNew: string | null;
      };
    };
    commands: { method: string; path: string; body: unknown }[];
  };
}

export interface AppStoreApprovalRequest extends AppStoreNotesRequest {
  subject: string;
  clientId: string;
  expectedPlanHash: string;
}

export interface AppStoreWriteApproval {
  id: string;
  planHash: string;
  expiresAt: string;
}

export interface AppStoreCatalogApp {
  id: string;
  name: string;
  bundleId: string;
  sku: string;
}
export interface AppStoreCatalogVersion {
  id: string;
  version: string;
  platform: string;
  state: string;
  appVersionState: string;
  releaseType: string;
}
export interface AppStoreVersionLocalization {
  locale: string;
  whatsNew: string | null;
}

export interface ReleaseNotesBatch {
  id: string;
  subject: string;
  clientId: string;
  state:
    | "PENDING_APPROVAL"
    | "QUEUED"
    | "RUNNING"
    | "COMPLETED"
    | "PARTIAL_FAILURE"
    | "REVIEW_REQUIRED";
  planHash: string;
  plan: {
    appId: string;
    appName: string;
    version: AppStoreCatalogVersion;
    items: {
      locale: string;
      localizationId: string;
      before: string | null;
      after: string;
      snapshotHash: string;
    }[];
  };
  results: { locale: string; state: string; errorCode: string | null }[];
  expiresAt: string | null;
  updatedAt: string;
  errorCode: string | null;
}
export interface ReleaseNotesBatchSummary {
  id: string;
  appName: string;
  version: string;
  state: ReleaseNotesBatch["state"];
  total: number;
  succeeded: number;
  updatedAt: string;
}
export interface ReleaseNotesProposal {
  appId: string;
  version: string;
  subject: string;
  clientId: string;
  localizations: Record<string, string>;
}
