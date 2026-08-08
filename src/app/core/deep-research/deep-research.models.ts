export type DeepResearchStatus =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'INCOMPLETE';

export interface DeepResearchSource {
  title: string;
  url: string;
}

export interface DeepResearchJob {
  id: string;
  status: DeepResearchStatus;
  query: string;
  model: string;
  maxSearches: number;
  report: string | null;
  sources: DeepResearchSource[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
