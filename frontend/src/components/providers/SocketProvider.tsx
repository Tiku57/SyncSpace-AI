'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../../types';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextType {
  socket: AppSocket | null;
  isConnected: boolean;
  sendMessage: (text: string, isRetry?: boolean) => void;
  cancelMessage: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  cancelMessage: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Extract actions from our Zustand store
  const { setItems, addItem, updateItem, removeItem, addMessage, updateLastMessage, clearWorkspace, setActiveRequestId, setGenerating, cancelActiveRequest } = useWorkspaceStore();

  useEffect(() => {
    // Initialize Socket.IO connection with polling fallback to resolve timeout errors
    const socketInstance: AppSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', { 
      reconnection: true, 
      reconnectionAttempts: Infinity, 
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['polling', 'websocket'] 
    });
  socketInstance.on('connect_error', (err) => { console.error('Socket connection error:', err); });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('🔗 Connected to SyncSpace WebSocket server');
      // Resync state to recover any missed events while offline
      socketInstance.emit('workspace:request_sync');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from WebSocket server');
    });

    // Wire up server events to Zustand store updates
    socketInstance.on('workspace:sync', (payload) => {
      // Handle legacy object directly, or new payload structure
      const items = Array.isArray(payload) ? payload : payload.items;
      const reqId = Array.isArray(payload) ? undefined : payload.requestId;
      
      if (!reqId || reqId === useWorkspaceStore.getState().activeRequestId) {
        setItems(items);
        setGenerating(false);
      }
    });

    socketInstance.on('item:add', (item) => {
      addItem(item);
    });

    socketInstance.on('item:update', (item) => {
      updateItem(item);
    });

    socketInstance.on('item:remove', (itemId) => {
      removeItem(itemId);
    });

    socketInstance.on('clear_workspace', () => {
      clearWorkspace();
      setGenerating(false);
    });

    socketInstance.on('ai:response', (payload) => {
      const message = payload.message || payload;
      const reqId = payload.requestId;
      if (!reqId || reqId === useWorkspaceStore.getState().activeRequestId) {
        addMessage({ ...message, sender: 'ai', requestId: reqId });
        setGenerating(false);
      }
    });

    socketInstance.on('ai:stream:start', (payload) => {
      const message = payload.message || payload;
      const reqId = payload.requestId;
      if (!reqId || reqId === useWorkspaceStore.getState().activeRequestId) {
        addMessage({ ...message, text: '', sender: 'ai', requestId: reqId });
      }
    });

    socketInstance.on('ai:stream:chunk', (payload) => {
      if (!payload.requestId || payload.requestId === useWorkspaceStore.getState().activeRequestId) {
        updateLastMessage(payload.text);
      }
    });

    socketInstance.on('ai:stream:end', (payload) => {
      if (!payload?.requestId || payload.requestId === useWorkspaceStore.getState().activeRequestId) {
        setGenerating(false);
      }
    });

    // Custom heartbeat monitor to ensure the connection isn't just a zombie socket
    const pingInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('ping'); // Basic ping just to keep firewalls open
      }
    }, 15000);

    setSocket(socketInstance);

    return () => {
      clearInterval(pingInterval);
      socketInstance.disconnect();
    };
  }, [setItems, addItem, updateItem, removeItem, addMessage, updateLastMessage, clearWorkspace, setGenerating]);

  const CLEAR_COMMANDS = ['clear', 'clear everything', 'reset workspace', 'start over'];

  // Watchdog: auto-cancel after 25s of silence from the backend
  const watchdogRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  // Wire watchdog cleanup into stream:end and clear_workspace events
  useEffect(() => {
    if (!socket) return;

    const handleStreamEnd = () => clearWatchdog();
    const handleClearWorkspace = () => clearWatchdog();
    const handleAiResponse = () => clearWatchdog();

    socket.on('ai:stream:end', handleStreamEnd);
    socket.on('clear_workspace', handleClearWorkspace);
    socket.on('ai:response', handleAiResponse);

    return () => {
      socket.off('ai:stream:end', handleStreamEnd);
      socket.off('clear_workspace', handleClearWorkspace);
      socket.off('ai:response', handleAiResponse);
      clearWatchdog();
    };
  }, [socket]);

  const sendMessage = (text: string, isRetry: boolean = false) => {
    if (socket && isConnected) {
      const state = useWorkspaceStore.getState();
      
      // If we are currently generating, the user is interrupting us with a new command.
      // We must cancel the active request first before queueing this new one.
      if (state.isGenerating && !isRetry) {
        cancelActiveRequest();
        clearWatchdog();
        socket.emit('user:message', { text: '', requestId: 'CLEAR_SYSTEM_COMMAND' });
      }

      const lowerText = text.trim().toLowerCase();
      const isClearCommand = CLEAR_COMMANDS.includes(lowerText);

      // ── PRIORITY 1: CLEAR COMMANDS ──
      // These bypass the AI entirely and execute synchronously.
      if (isClearCommand) {
        console.log('[CLEAR] System command intercepted. Executing immediately.');

        // 1. Cancel all pending AI work, which also removes the stuck typing indicator
        cancelActiveRequest();
        clearWatchdog();

        // 2. Add the user's message to chat history
        if (!isRetry) {
          addMessage({
            id: `user-${Date.now()}`,
            text,
            timestamp: new Date().toISOString(),
            sender: 'user'
          });
        }

        // 3. Wipe workspace state immediately (same render cycle)
        clearWorkspace();

        // 4. Tell the backend to wipe its persistent store
        socket.emit('user:message', { text, requestId: 'CLEAR_SYSTEM_COMMAND' });

        // 5. Add confirmation message
        addMessage({
          id: `ai-clear-${Date.now()}`,
          text: 'Workspace cleared locally.',
          timestamp: new Date().toISOString(),
          sender: 'ai'
        });

        return; // Do NOT proceed to the normal AI path
      }

      // ── NORMAL AI REQUESTS ──
      const requestId = crypto.randomUUID();
      setActiveRequestId(requestId);
      setGenerating(true);

      // Optimistically add the user's message to the UI instantly
      if (!isRetry) {
        addMessage({
          id: `user-${Date.now()}`,
          text,
          timestamp: new Date().toISOString(),
          sender: 'user'
        });
      }

      // Dispatch the message to the backend
      socket.emit('user:message', { text, requestId });

      // ── START WATCHDOG TIMER ──
      // If backend doesn't respond within 25s, auto-cancel and notify the user
      clearWatchdog(); // clear any prior watchdog
      watchdogRef.current = setTimeout(() => {
        const state = useWorkspaceStore.getState();
        if (state.activeRequestId === requestId && state.isGenerating) {
          console.warn(`[WATCHDOG] Request ${requestId} timed out after 25s. Auto-cancelling.`);
          cancelActiveRequest();
          addMessage({
            id: `watchdog-${Date.now()}`,
            text: "Request timed out. Please try again.",
            timestamp: new Date().toISOString(),
            sender: 'ai'
          });
        }
      }, 25_000);
    }
  };

  const cancelMessage = () => {
    console.log('[USER CANCEL] Request cancelled by user.');
    const state = useWorkspaceStore.getState();
    const requestId = state.activeRequestId;
    
    // Clean up UI immediately
    cancelActiveRequest();
    clearWatchdog();
    
    // Notify the backend to abort the generator if connected
    if (socket && isConnected && requestId) {
      socket.emit('user:message', { text: '', requestId: 'CLEAR_SYSTEM_COMMAND' });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, sendMessage, cancelMessage }}>
      {children}
    </SocketContext.Provider>
  );
};
