import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, WorkspaceItem } from '../types';
import { handleUserMessage } from '../controllers/chat.controller';
import { aiService } from '../services/ai.service';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(__dirname, '../../workspace_data.json');

// Shared server-side state with file-based persistence
export let workspaceStore: WorkspaceItem[] = [];

export const loadWorkspace = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      workspaceStore = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading workspace:', err);
  }
};

export const saveWorkspace = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(workspaceStore, null, 2));
  } catch (err) {
    console.error('Error saving workspace:', err);
  }
};

loadWorkspace();

export const setupSocketEvents = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Immediately sync the current canvas state to the new client
    socket.emit('workspace:sync', { items: workspaceStore });

    // Handle user sending a message to the AI
    const CLEAR_COMMANDS = ['clear', 'clear everything', 'reset workspace', 'start over'];

    socket.on('user:message', (payload) => {
      // Handle older clients that might still send a string
      const text = typeof payload === 'string' ? payload : payload.text;
      const requestId = typeof payload === 'string' ? 'legacy' : payload.requestId;
      console.log(`💬 Message from ${socket.id} (req: ${requestId}): ${text}`);

      // ── PRIORITY INTERCEPT: Clear commands bypass AI entirely ──
      const lowerText = text.trim().toLowerCase();
      if (CLEAR_COMMANDS.includes(lowerText) || requestId === 'CLEAR_SYSTEM_COMMAND') {
        console.log('[CLEAR] Server-side clear intercepted. Wiping workspace store.');
        aiService.cancelRequestsForSocket(socket.id);
        workspaceStore.length = 0;
        saveWorkspace();
        socket.emit('clear_workspace');
        return; // Do NOT send to AI
      }

      handleUserMessage(socket, text, requestId);
    });

    // Handle manual interactions (drag & drop in the 3D canvas)
    socket.on('item:update', (item) => {
      console.log(`🔄 Item updated by ${socket.id}: ${item.id}`);
      
      const index = workspaceStore.findIndex(i => i.id === item.id);
      if (index !== -1) {
        workspaceStore[index] = item;
        saveWorkspace();
      }

      // If multiplayer, broadcast to others: socket.broadcast.emit('item:update', item);
    });

    socket.on('workspace:request_sync', () => {
      socket.emit('workspace:sync', { items: workspaceStore });
    });

    socket.on('ping', () => {
      // Just keep the connection alive
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}. Reason: ${reason}`);
      aiService.cancelRequestsForSocket(socket.id);
    });
    
    socket.on('error', (err) => {
      console.error(`Socket Error for ${socket.id}:`, err);
    });
  });
};
