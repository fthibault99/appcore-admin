export type BarcodeDomain = 'FOOD' | 'LEGO' | 'WINE';

export interface AdminBarcodeSummary {
  id: number;
  barcode: string;
  lookupDomain: BarcodeDomain;
  productName: string | null;
  brand: string | null;
  category: string | null;
  legoSetNumber: string | null;
  provider: string;
  enrichmentProvider: string | null;
  updatedAt: string;
  expiresAt: string;
  manualOverride: boolean;
  version: number;
}

export interface AdminBarcodeDetail extends AdminBarcodeSummary {
  description: string | null;
  imageUrl: string | null;
  ingredients: string | null;
  createdAt: string;
}

export interface BarcodePage {
  content: AdminBarcodeSummary[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface UpdateAdminBarcode {
  expectedVersion: number;
  productName: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  ingredients: string | null;
  legoSetNumber: string | null;
}
