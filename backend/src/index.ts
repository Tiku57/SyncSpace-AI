import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/env';
import { setupSocketEvents } from './socket/events';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);

// Add global error handling to prevent backend crashes
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Initialize Socket.IO with strong typing
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"]
  }
});

// Setup event listeners
setupSocketEvents(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

server.listen(config.port, () => {
  console.log(`\n=========================================`);
  console.log(`🚀 SyncSpace AI Backend running on port ${config.port}`);
  console.log(`=========================================\n`);
});
