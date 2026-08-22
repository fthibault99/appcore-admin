export type RecipeExtractionDomainReason = 'MANUAL' | 'HTTP_402' | 'HTTP_403';

export interface RecipeExtractionDomain {
  id: number; domain: string; active: boolean; reason: RecipeExtractionDomainReason;
  sampleUrl: string | null; lastHttpStatus: number | null; firstObservedAt: string | null;
  lastObservedAt: string | null; occurrenceCount: number; notes: string | null;
  createdAt: string; updatedAt: string; version: number;
}

export interface CreateRecipeExtractionDomain { domain: string; sampleUrl: string | null; notes: string | null; }
export interface UpdateRecipeExtractionDomain extends CreateRecipeExtractionDomain {
  active: boolean; reason: RecipeExtractionDomainReason; expectedVersion: number;
}
