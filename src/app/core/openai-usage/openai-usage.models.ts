export interface OpenAIUsage {
  id: string;
  appClientId: string | null;
  apiKeyId: string | null;
  feature: string;
  model: string;
  startedAt: string;
  durationMs: number;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  serviceTier: string | null;
  contextType: string | null;
  errorCode: string | null;
  priceId: string | null;
  inputCostUsd: number | null;
  cachedInputCostUsd: number | null;
  cacheWriteCostUsd: number | null;
  outputCostUsd: number | null;
  estimatedCostUsd: number | null;
  pricingVersion: string | null;
}

export interface OpenAIModelPrice {
  id: string;
  model: string;
  serviceTier: string;
  contextType: string;
  minInputTokens: number;
  maxInputTokens: number | null;
  inputUsdPerMillion: number;
  cachedInputUsdPerMillion: number | null;
  cacheWriteUsdPerMillion: number | null;
  outputUsdPerMillion: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: string;
  sourceUrl: string | null;
  createdAt: string;
}

export interface CreateOpenAIModelPrice {
  model: string;
  serviceTier: string;
  contextType: string;
  minInputTokens: number;
  maxInputTokens: number | null;
  inputUsdPerMillion: number;
  cachedInputUsdPerMillion: number | null;
  cacheWriteUsdPerMillion: number | null;
  outputUsdPerMillion: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: string;
  sourceUrl: string | null;
}

export interface OpenAIUsagePage {
  content: OpenAIUsage[];
  totalElements: number;
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface OpenAIUsageSummary {
  from: string;
  to: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  averageDurationMs: number;
  estimatedCostUsd: number | null;
}
