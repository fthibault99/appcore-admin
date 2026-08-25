export interface AdminBricksetSetSummary {
  id: number;
  setNumber: string;
  numberVariant: number;
  bricksetSetId: number | null;
  setName: string | null;
  ean: string | null;
  upc: string | null;
  hasAdditionalImages: boolean;
  requestCount: number;
  lastRequestedAt: string | null;
  fetchedAt: string;
  imagesFetchedAt: string | null;
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
  updatedAt: string;
  rawJson: unknown;
  additionalImagesRawJson: unknown | null;
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

export interface AdminBricksetUsageDay {
  date: string;
  count: number;
  fetchedAt: string;
}

export interface AdminBricksetUsageSyncResponse {
  daysSynchronized: number;
}
