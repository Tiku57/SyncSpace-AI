export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const memoryStore: Record<string, ChatMessage[]> = {};
