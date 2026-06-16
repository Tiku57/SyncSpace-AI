export interface UserMessage {
  id: string;
  text: string;
  timestamp: string;
  sender: 'user' | 'ai';
  requestId?: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  price: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: [number, number, number];
  type: string;
  productivityImpact?: number;
  ergonomicsImpact?: number;
  designImpact?: number;
}

export interface ServerToClientEvents {
  'ai:response': (payload: { message: Omit<UserMessage, 'sender'>, requestId?: string }) => void;
  'ai:stream:start': (payload: { message: Omit<UserMessage, 'sender'>, requestId: string }) => void;
  'ai:stream:chunk': (payload: { id: string, text: string, requestId: string }) => void;
  'ai:stream:end': (payload: { id: string, requestId: string }) => void;
  'item:add': (item: WorkspaceItem) => void;
  'item:update': (item: WorkspaceItem) => void;
  'item:remove': (itemId: string) => void;
  'workspace:sync': (payload: { items: WorkspaceItem[], requestId?: string } | WorkspaceItem[]) => void;
  'clear_workspace': () => void;
}

export interface ClientToServerEvents {
  'user:message': (payload: { text: string, requestId: string } | string) => void;
  'item:add': (item: WorkspaceItem) => void;
  'item:update': (item: WorkspaceItem) => void;
  'item:remove': (itemId: string) => void;
  'workspace:request_sync': () => void;
  'ping': () => void;
}
