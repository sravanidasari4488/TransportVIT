require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io available globally
global.io = io;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB connection with graceful error handling
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
        console.log("✅ MongoDB Connected");
    }).catch((err) => {
        console.error("❌ MongoDB Connection Error:", err.message);
        console.warn("⚠️  Server will continue without MongoDB. Some features may not work.");
        console.warn("💡 To fix this:");
        console.warn("   1. Install MongoDB locally: https://www.mongodb.com/try/download/community");
        console.warn("   2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas");
        console.warn("   3. Update MONGO_URI in your .env file");
    });
} else {
    console.warn("⚠️  MONGO_URI not set in .env file");
    console.warn("💡 Add MONGO_URI to your .env file to enable database features");
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join room for a specific route
  socket.on('join-route', (routeId) => {
    const normalizedRouteId = routeId.toUpperCase();
    const roomName = `route-${normalizedRouteId}`;
    socket.join(roomName);
    console.log(`📍 Client ${socket.id} joined route room: ${roomName} (routeId: ${normalizedRouteId})`);
    
    // Send confirmation back to client
    socket.emit('route-joined', { routeId: normalizedRouteId, room: roomName });
  });

  // Leave route room
  socket.on('leave-route', (routeId) => {
    socket.leave(`route-${routeId.toUpperCase()}`);
    console.log(`📍 Client ${socket.id} left route: ${routeId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Debug: Log all registered routes
const routes = require("./routes/index");
console.log("🔍 Registering routes...");

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", routes);

// Debug: Log all registered routes after mounting
app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        console.log(`📍 Route: ${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                console.log(`📍 Route: ${handler.route.stack[0].method.toUpperCase()} /api${handler.route.path}`);
            }
        });
    }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO server ready`);
});