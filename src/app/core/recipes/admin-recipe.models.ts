export interface Recipe {
  url: string;
  name: string;
  image: string[] | null;
  author: string | null;
  datePublished: string | null;
  description: string | null;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  keywords: string | null;
  recipeIngredient: string[];
  recipeInstructions: string[];
  recipeYield: string | null;
}

export interface AdminRecipeSummary {
  id: string;
  name: string;
  sourceDomain: string;
  normalizedUrl: string;
  extractionMethod: string;
  updatedAt: string;
  expiresAt: string | null;
  accessCount: number;
  manualOverride: boolean;
  version: number;
}

export interface AdminRecipeDetail {
  id: string;
  normalizedUrl: string;
  sourceDomain: string;
  extractionMethod: string;
  extractorVersion: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  manualOverride: boolean;
  version: number;
  recipe: Recipe;
}

export interface RecipePage {
  content: AdminRecipeSummary[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
