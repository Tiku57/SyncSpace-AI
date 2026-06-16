import { Socket } from 'socket.io';
import { aiService } from '../services/ai.service';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types';
import { workspaceStore, saveWorkspace } from '../socket/events';

const REQUEST_TIMEOUT_MS = 30_000; // 30 second hard ceiling for any request

export const handleUserMessage = async (
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  text: string,
  requestId: string
) => {
  const startTime = Date.now();
  console.log(`[REQUEST ${requestId}] STARTED — "${text.substring(0, 60)}"`);

  const aiMessageId = `ai-${Date.now()}`;

  try {
    // Send a start event to show "Thinking..."
    socket.emit('ai:stream:start', {
      message: {
        id: aiMessageId,
        text: '',
        timestamp: new Date().toISOString()
      },
      requestId
    });

    // Create a timeout promise that rejects after REQUEST_TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), REQUEST_TIMEOUT_MS);
    });

    // Race the AI processing against the timeout
    const aiResult = await Promise.race([
      aiService.processUserMessage(socket.id, text, workspaceStore, (chunk) => {
        socket.emit('ai:stream:chunk', { id: aiMessageId, text: chunk, requestId });
      }),
      timeoutPromise
    ]);
    
    // Stream finished
    socket.emit('ai:stream:end', { id: aiMessageId, requestId });

    // Execute function calls (e.g., adding or removing 3D items from the canvas)
    for (const action of aiResult.actions) {
      if (action.type === 'sync' && action.workspace) {
        workspaceStore.length = 0;
        workspaceStore.push(...action.workspace);
        saveWorkspace();
        socket.emit('workspace:sync', { items: action.workspace, requestId });
      } else if (action.type === 'clear_workspace') {
        workspaceStore.length = 0;
        saveWorkspace();
        socket.emit('clear_workspace');
      }
      // Fallbacks just in case
      else if (action.type === 'add' && action.item) {
        workspaceStore.push(action.item);
        saveWorkspace();
        socket.emit('item:add', action.item);
      } else if (action.type === 'remove' && action.itemId) {
        const index = workspaceStore.findIndex(i => i.id === action.itemId);
        if (index !== -1) {
          workspaceStore.splice(index, 1);
          saveWorkspace();
        }
        socket.emit('item:remove', action.itemId);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[REQUEST ${requestId}] SUCCESS — ${duration}ms`);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isAbort = error?.message === 'AbortError';
    const isTimeout = error?.message === 'REQUEST_TIMEOUT';

    if (isAbort) {
      console.log(`[REQUEST ${requestId}] CANCELLED — ${duration}ms`);
      // Silently drop — the frontend already handled the clear/cancel
      // Still emit stream:end to guarantee typing indicator cleanup
      socket.emit('ai:stream:end', { id: aiMessageId, requestId });
      return;
    }

    if (isTimeout) {
      console.error(`[REQUEST ${requestId}] TIMEOUT — ${duration}ms (limit: ${REQUEST_TIMEOUT_MS}ms)`);
      // Force-cancel the in-progress AI work
      aiService.cancelRequestsForSocket(socket.id);
      // Tell the client the request is over + show error
      socket.emit('ai:stream:end', { id: aiMessageId, requestId });
      socket.emit('ai:response', {
        message: {
          id: `timeout-${Date.now()}`,
          text: "Unable to process your request right now — it took too long. Please try again.",
          timestamp: new Date().toISOString()
        },
        requestId
      });
      return;
    }

    // Generic error
    console.error(`[REQUEST ${requestId}] FAILED — ${duration}ms:`, error?.message || error);
    socket.emit('ai:stream:end', { id: aiMessageId, requestId });
    socket.emit('ai:response', {
      message: {
        id: `error-${Date.now()}`,
        text: "I wasn't able to analyze your workspace right now. Please try again.",
        timestamp: new Date().toISOString()
      },
      requestId
    });
  }
};
