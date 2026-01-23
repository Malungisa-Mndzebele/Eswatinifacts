import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import { connectRedis } from './config/redis.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import blogRoutes from './routes/blog.js';
import mediaRoutes from './routes/media.js';
import searchRoutes from './routes/search.js';
import newsletterRoutes from './routes/newsletter.js';
import dataRoutes from './routes/data.js';
import translationRoutes from './routes/translation.js';
import visualizationRoutes from './routes/visualization.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL || "http://localhost:3000"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API version endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'Eswatini Facts API',
    description: 'Data transparency platform API',
  });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/data', dataRoutes);
app.use('/api/v1/translations', translationRoutes);
app.use('/api/v1/visualization', visualizationRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      path: req.path,
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    },
  });
});

// Initialize connections and start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    
    // Connect to Redis
    const redisConnected = await connectRedis();
    if (!redisConnected) {
      console.warn('Warning: Redis connection failed. Caching will be disabled.');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

export default app;
