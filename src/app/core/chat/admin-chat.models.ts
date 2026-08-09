export interface AdminChatUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface AdminChatResponse {
  answer: string;
  model: string;
  usage: AdminChatUsage;
}

export type AdminChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'completed'; response: AdminChatResponse };
