export interface AdminBricksetSetSummary {
  id: number;
  setNumber: string;
  numberVariant: number;
  bricksetSetId: number | null;
  setName: string | null;
  ean: string | null;
  upc: string | null;
  hasAdditionalImages: boolean;
  hasInstructions: boolean;
  requestCount: number;
  lastRequestedAt: string | null;
  fetchedAt: string;
  imagesFetchedAt: string | null;
  instructionsFetchedAt: string | null;
  bricksetLastSyncedAt: string | null;
  bricksetSyncSource: 'IOS_APP' | 'AUTO_SYNC' | 'ADMIN_MANUAL' | null;
  updatedAt: string;
}

export interface AdminBricksetSetDetail {
  id: number;
  setNumber: string;
  numberVariant: number;
  bricksetSetId: number | null;
  setName: string | null;
  ean: string | null;
  upc: string | null;
  requestCount: number;
  lastRequestedAt: string | null;
  fetchedAt: string;
  imagesFetchedAt: string | null;
  instructionsFetchedAt: string | null;
  bricksetLastSyncedAt: string | null;
  bricksetSyncSource: 'IOS_APP' | 'AUTO_SYNC' | 'ADMIN_MANUAL' | null;
  updatedAt: string;
  rawJson: unknown;
  additionalImagesRawJson: unknown | null;
  instructionsRawJson: unknown | null;
}

export interface BricksetSetPage {
  content: AdminBricksetSetSummary[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface AdminBrickSetDescription {
  id: number;
  setNum: string;
  language: string;
  description: string;
  model: string;
  generatedAt: string;
}

export interface BrickSetDescriptionPage {
  content: AdminBrickSetDescription[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface AdminBricksetUsageDay {
  date: string;
  count: number;
  fetchedAt: string;
}

export interface AdminBricksetUsageSyncResponse {
  daysSynchronized: number;
}

export interface BricksetSyncConfiguration {
  enabled: boolean;
  minimumAgeDays: number;
  dailyCallLimit: number;
  checkIntervalMinutes: number;
  concurrency: number;
}
export interface BricksetSyncStatistics {
  totalSets: number;
  neverSynced: number;
  staleSets: number;
  iosAppSets: number;
  manualSyncSets: number;
  manualCallsToday: number;
  autoSyncSets: number;
  callsToday: number;
  remainingBudget: number;
  lastRunAt: string | null;
  lastResult: string | null;
}
export interface BricksetOldestSet {
  setNumber: string;
  numberVariant: number;
  bricksetLastSyncedAt: string | null;
  bricksetSyncSource: string | null;
}

export type BricksetSourceFilter = 'ALL' | 'IOS_APP' | 'AUTO_SYNC' | 'ADMIN_MANUAL' | 'UNKNOWN';
export type BricksetDateSort = 'lastRequestedAt' | 'fetchedAt' | 'imagesFetchedAt' | 'instructionsFetchedAt' | 'bricksetLastSyncedAt' | 'updatedAt';
export interface BricksetListOptions {
  hasInstructions?: boolean;
  hasImages?: boolean;
  source: BricksetSourceFilter;
  sortBy: BricksetDateSort;
  direction: 'ASC' | 'DESC';
}
