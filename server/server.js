/**
 * Main Server File
 * Production-ready Express server with Socket.io for real-time communication
 * MongoDB connection using Mongoose with dotenv configuration
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const setupSocketHandlers = require('./socket/socketHandlers');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// CORS origin: allow specific frontend (Render env) or fallback to *
const ALLOWED_ORIGIN = process.env.CLIENT_URL || '*';

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: false
  }
});

// Middleware
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files (HTML, CSS, JS)
// This will serve files from the /public folder at the root URL
app.use(express.static(path.join(__dirname, '../public')));

// API Routes (all backend endpoints start with /api)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/friends', require('./routes/friendRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// If no API route matched and the request is not for /api,
// let the frontend handle the route (useful if you add SPA routing later)
app.get(/^\/(?!api).*/, (req, res, next) => {
  // If a static file already handled the request, skip this
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});
