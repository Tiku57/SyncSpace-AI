import { create } from 'zustand';
import { WorkspaceItem, UserMessage } from '../types';

interface WorkspaceState {
  items: WorkspaceItem[];
  messages: UserMessage[];
  totalPrice: number;
  subtotal: number;
  tax: number;
  analytics: { 
    productivity: number; 
    ergonomics: number; 
    design: number;
    value: number;
    roi: number;
    cableManagement: number;
    futureProofing: number;
    focus: number;
  };
  selectedItemId: string | null;
  cameraPosition: [number, number, number] | null;
  cameraTarget: [number, number, number] | null;
  
  activeRequestId: string | null;
  workspaceVersion: number;
  isGenerating: boolean;
  
  // Actions
  setItems: (items: WorkspaceItem[]) => void;
  addItem: (item: WorkspaceItem) => void;
  updateItem: (item: WorkspaceItem) => void;
  removeItem: (itemId: string) => void;
  addMessage: (message: UserMessage) => void;
  updateLastMessage: (text: string) => void;
  setSelectedItemId: (id: string | null) => void;
  setCamera: (position: [number, number, number], target: [number, number, number]) => void;
  clearWorkspace: () => void;
  setActiveRequestId: (id: string | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  cancelActiveRequest: () => void;
}

const calculatePrices = (items: WorkspaceItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + (Number.isNaN(Number(item.price)) ? 0 : Number(item.price)), 0);
  const tax = Math.round(subtotal * 0.10); // 10% tax
  
  let prod = 0, ergo = 0, dsgn = 0;
  
  const monitorCount = items.filter(i => i.type === 'monitor').length;
  const hasChair = items.some(i => i.type === 'chair');
  const hasDesk = items.some(i => i.type === 'desk');
  const hasLaptop = items.some(i => i.type === 'laptop');
  const hasPc = items.some(i => i.type === 'box');
  
  items.forEach(i => {
    const pi = typeof i.productivityImpact === 'number' && !Number.isNaN(i.productivityImpact) ? i.productivityImpact : 0;
    const ei = typeof i.ergonomicsImpact === 'number' && !Number.isNaN(i.ergonomicsImpact) ? i.ergonomicsImpact : 0;
    const di = typeof i.designImpact === 'number' && !Number.isNaN(i.designImpact) ? i.designImpact : 0;

    prod += pi;
    ergo += ei;
    dsgn += di;

    if (i.type === 'monitor') { prod += 15; dsgn += 5; }
    if (i.type === 'stand') { prod += 5; ergo += 10; dsgn += 5; }
    if (i.type === 'desk') { prod += 10; ergo += 20; dsgn += 15; }
    if (i.type === 'chair') { ergo += 25; dsgn += 10; }
    if (i.type === 'keyboard') { prod += 10; dsgn += 5; }
    if (i.type === 'mouse') { prod += 5; ergo += 5; }
    if (i.type === 'laptop') { prod += 15; dsgn += 10; }
    if (i.type === 'box') { prod += 20; dsgn += 5; }
    if (i.type === 'tablet') { prod += 5; dsgn += 5; }
    if (i.type === 'webcam') { prod += 10; dsgn += 5; }
    if (i.type === 'speakers') { prod += 5; dsgn += 10; }
    if (i.type === 'tv') { prod -= 5; dsgn += 15; } // TVs hurt productivity but look cool
  });

  // Base starting scores
  prod += 10; ergo += 10; dsgn += 10;

  if (monitorCount === 2) {
    prod += 10; // Dual monitor bonus
  } else if (monitorCount > 2) {
    prod -= (monitorCount - 2) * 5; // Diminishing returns, too many monitors is distracting
  }

  // Realistic Constraints
  if (!hasChair) ergo = Math.min(ergo, 40); // Cannot be highly ergonomic without a chair
  if (!hasDesk) ergo = Math.min(ergo, 40);  // Cannot be highly ergonomic without a desk
  if (monitorCount === 0 && !hasLaptop) prod = Math.min(prod, 30); // Need a screen to be productive
  if (!hasLaptop && !hasPc) prod = Math.min(prod, 40); // Need a computer to be highly productive

  // Base design score scales with total items (up to a point)
  dsgn += Math.min(items.length * 3, 20);

  let value = 10, roi = 10, cableManagement = 80, futureProofing = 10, focus = 50;

  // Evaluate Cable Management
  if (items.some(i => i.type === 'stand')) cableManagement += 20;
  if (monitorCount > 2) cableManagement -= 30; // Lots of cables
  if (items.some(i => i.type === 'tv')) cableManagement -= 15;

  // Evaluate Future Proofing
  if (hasPc) futureProofing += 40; // Upgradeable PC
  if (hasLaptop) futureProofing += 20;

  // Evaluate Focus
  if (monitorCount === 1) focus += 30; // Minimalist focus
  if (monitorCount > 3) focus -= 20; // Too much going on
  if (items.some(i => i.type === 'tv')) focus -= 40; // Distracting

  // Value & ROI
  const totalImpact = prod + ergo + dsgn;
  value = totalImpact > 0 ? Math.min(100, (totalImpact / (subtotal || 100)) * 50) : 0;
  roi = value * 1.5;

  const safeProd = Math.max(0, Math.min(100, isNaN(prod) ? 0 : prod));
  const safeErgo = Math.max(0, Math.min(100, isNaN(ergo) ? 0 : ergo));
  const safeDsgn = Math.max(0, Math.min(100, isNaN(dsgn) ? 0 : dsgn));
  const safeValue = Math.max(0, Math.min(100, isNaN(value) ? 0 : value));
  const safeRoi = Math.max(0, Math.min(100, isNaN(roi) ? 0 : roi));
  const safeCable = Math.max(0, Math.min(100, isNaN(cableManagement) ? 0 : cableManagement));
  const safeFuture = Math.max(0, Math.min(100, isNaN(futureProofing) ? 0 : futureProofing));
  const safeFocus = Math.max(0, Math.min(100, isNaN(focus) ? 0 : focus));

  return { 
    subtotal: isNaN(subtotal) ? 0 : subtotal, 
    tax: isNaN(tax) ? 0 : tax, 
    totalPrice: isNaN(subtotal + tax) ? 0 : subtotal + tax,
    analytics: { 
      productivity: safeProd, 
      ergonomics: safeErgo, 
      design: safeDsgn,
      value: safeValue,
      roi: safeRoi,
      cableManagement: safeCable,
      futureProofing: safeFuture,
      focus: safeFocus
    }
  };
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  items: [],
  messages: [
    {
      id: 'welcome-msg',
      text: 'Welcome to SyncSpace AI! Tell me what kind of workspace you want to build.',
      timestamp: new Date().toISOString(),
      sender: 'ai'
    }
  ],
  totalPrice: 0,
  subtotal: 0,
  tax: 0,
  analytics: { 
    productivity: 10, ergonomics: 10, design: 10,
    value: 0, roi: 0, cableManagement: 100, futureProofing: 0, focus: 50
  },
  selectedItemId: null,
  cameraPosition: null,
  cameraTarget: null,
  activeRequestId: null,
  workspaceVersion: 0,
  isGenerating: false,

  setItems: (items) => set({ 
    items, 
    ...calculatePrices(items)
  }),

  addItem: (item) => set((state) => {
    // Prevent duplicate items
    if (state.items.find(i => i.id === item.id)) return state;
    
    const newItems = [...state.items, item];
    return {
      items: newItems,
      ...calculatePrices(newItems)
    };
  }),

  updateItem: (updatedItem) => set((state) => {
    const newItems = state.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    return {
      items: newItems,
      ...calculatePrices(newItems)
    };
  }),

  removeItem: (itemId) => set((state) => {
    const newItems = state.items.filter(item => item.id !== itemId);
    return {
      items: newItems,
      ...calculatePrices(newItems)
    };
  }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  updateLastMessage: (text) => set((state) => {
    if (state.messages.length === 0) return state;
    const newMessages = [...state.messages];
    newMessages[newMessages.length - 1].text += text;
    return { messages: newMessages };
  }),

  setSelectedItemId: (id) => set({ selectedItemId: id }),

  setCamera: (position, target) => set({ cameraPosition: position, cameraTarget: target }),

  clearWorkspace: () => set((state) => {
    console.log("[CLEAR WORKSPACE]");
    console.log("Before:", state.items.length);
    const result = {
      items: [],
      selectedItemId: null,
      activeRequestId: null,
      workspaceVersion: state.workspaceVersion + 1,
      ...calculatePrices([])
    };
    console.log("After: 0");
    return result;
  }),

  setActiveRequestId: (id) => set({ activeRequestId: id }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  
  cancelActiveRequest: () => set((state) => {
    // Instead of deleting the AI message, update it to indicate cancellation
    const newMessages = state.messages.map(msg => {
      if (msg.sender === 'ai' && msg.requestId === state.activeRequestId) {
        return {
          ...msg,
          text: msg.text || "Request cancelled by user."
        };
      }
      return msg;
    });
    
    return {
      activeRequestId: null,
      isGenerating: false,
      messages: newMessages
    };
  })
}));
