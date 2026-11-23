const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : '*';

app.use(cors({ origin: allowedOrigins }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve built Vite frontend if dist/ exists; otherwise respond with backend status (e.g. Render backend-only deploy)
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/yjs')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(200).json({
      service: 'DevSync Backend',
      status: 'ok',
      endpoints: {
        health: '/health',
        socketIO: '/socket.io',
        yjs: '/yjs/:roomId',
      },
    });
  });
}

const server = http.createServer(app);

// Setup Socket.IO for chat, presence, and room signaling
const io = new Server(server, {
  destroyUpgrade: false,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Setup Yjs CRDT WebSocket server on the same HTTP server under /yjs
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true });
});

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (pathname.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else if (!pathname.startsWith('/socket.io')) {
    socket.destroy();
  }
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    
    // Notify others that a new user has joined
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit('joined', {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on('chat-message', ({ roomId, message, username, timestamp }) => {
    io.to(roomId).emit('chat-message', { message, username, timestamp });
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit('disconnected', {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
  });

  // WebRTC Signaling for Voice Call
  socket.on('start-call', ({ roomId, username }) => {
    socket.in(roomId).emit('incoming-call', { caller: username, callerId: socket.id });
  });

  socket.on('webrtc-offer', ({ target, caller, sdp }) => {
    io.to(target).emit('webrtc-offer', { caller, callerId: socket.id, sdp });
  });

  socket.on('webrtc-answer', ({ target, sdp }) => {
    io.to(target).emit('webrtc-answer', { responderId: socket.id, sdp });
  });

  socket.on('webrtc-ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('webrtc-ice-candidate', { senderId: socket.id, candidate });
  });

  socket.on('join-call', ({ roomId }) => {
    // Tell everyone else in the call that someone new joined so they can initiate an offer
    socket.in(roomId).emit('user-joined-call', { userId: socket.id });
  });

  socket.on('leave-call', ({ roomId }) => {
    socket.in(roomId).emit('user-left-call', { userId: socket.id });
  });

  // Security & Authorization Events
  socket.on('request-join', ({ roomId, username }) => {
    // Send request to everyone in the room (only host will handle it)
    socket.in(roomId).emit('join-request', { username, socketId: socket.id });
  });

  socket.on('approve-join', ({ targetSocketId, roomId }) => {
    io.to(targetSocketId).emit('join-approved', { roomId });
  });

  socket.on('reject-join', ({ targetSocketId }) => {
    io.to(targetSocketId).emit('join-rejected');
  });

  socket.on('update-permissions', ({ roomId, targetSocketId, role }) => {
    io.to(targetSocketId).emit('permission-updated', { role });
    // Broadcast to others so they can update UI indicators
    socket.in(roomId).emit('user-permission-changed', { socketId: targetSocketId, role });
  });

  socket.on('disconnect', () => {
    delete userSocketMap[socket.id];
  });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, '0.0.0.0', () => console.log(`DevSync server listening on port ${PORT}`));
