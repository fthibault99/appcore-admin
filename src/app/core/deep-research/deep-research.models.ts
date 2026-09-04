export type DeepResearchStatus =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'INCOMPLETE'
  | 'TIMED_OUT';
export type DeepResearchProfile = 'QUICK' | 'STANDARD' | 'DEEP' | 'EXPERT' | 'ULTRA';
export type DeepResearchQualityRating = 'POOR' | 'ACCEPTABLE' | 'GOOD' | 'EXCELLENT';

export interface DeepResearchUsage {
  actualWebSearches: number | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  inputCostUsd: number | null;
  cachedInputCostUsd: number | null;
  cacheWriteCostUsd: number | null;
  outputCostUsd: number | null;
  webSearchCostUsd: number | null;
  totalCostUsd: number | null;
}

export interface DeepResearchSource {
  title: string;
  url: string;
}

export interface DeepResearchJob {
  id: string;
  status: DeepResearchStatus;
  query: string;
  profile: DeepResearchProfile | null;
  model: string;
  maxSearches: number;
  maxToolCalls: number;
  reasoningEffort: string;
  timeoutSeconds: number;
  report: string | null;
  sources: DeepResearchSource[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  sourceCount: number;
  usage: DeepResearchUsage | null;
  qualityRating: DeepResearchQualityRating | null;
  qualityNotes: string | null;
}

export interface DeepResearchJobSummary {
  id: string;
  status: DeepResearchStatus;
  query: string;
  profile: DeepResearchProfile | null;
  model: string;
  maxSearches: number;
  actualWebSearches: number | null;
  totalCostUsd: number | null;
  qualityRating: DeepResearchQualityRating | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface DeepResearchPage {
  content: DeepResearchJobSummary[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
