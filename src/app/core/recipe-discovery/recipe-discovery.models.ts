export type RecipeDiscoveryState =
  | 'SELECTING_PRODUCTS'
  | 'SEARCHING_WEB'
  | 'GENERATING_RESULTS'
  | 'RESOLVING_IMAGES';

export interface InventoryProduct {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  storageSpace?: string | null;
  storeDepartment?: string | null;
}

export interface RecipeDiscoveryRequest {
  locale: string;
  priorityProductIds: string[];
  comment?: string | null;
  inventory: InventoryProduct[];
}

export interface DiscoveredRecipe {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string;
  language: string;
  matchedProducts: string[];
}

export interface RecipeDiscoveryResult { recipes: DiscoveredRecipe[]; }

export type RecipeDiscoveryStreamEvent =
  | { type: 'progress'; state: RecipeDiscoveryState }
  | { type: 'result'; result: RecipeDiscoveryResult }
  | { type: 'error'; code: string; message: string };
