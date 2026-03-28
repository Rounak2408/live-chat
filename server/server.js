

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const setupSocketHandlers = require('./socket/socketHandlers');


connectDB();

const app = express();
const server = http.createServer(app);


const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
};

// CORS MUST be before routes
app.use(cors(corsOptions));
// Global preflight support
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io setup with matching CORS
const io = socketIo(server, { cors: corsOptions });

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
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for network access
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use!`);
    console.error(`💡 Solutions:`);
    console.error(`   1. Kill the process using port ${PORT}:`);
    console.error(`      Windows: netstat -ano | findstr :${PORT}`);
    console.error(`      Then: taskkill /PID <PID> /F`);
    console.error(`   2. Use a different port by setting PORT in .env file`);
    console.error(`   3. Or change the default port in server.js`);
    process.exit(1);
  } else {
    console.error('❌ Server Error:', err);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});
