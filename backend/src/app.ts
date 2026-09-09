import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import { csrfMiddleware, getCsrfTokenHandler } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ENV } from './config/env.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'http://localhost:*', 'https://localhost:*'],
      // Allow Socket.io connections
      workerSrc: ["'self'", 'blob:'],
    },
  },
  // Disable referrer policy to same-origin if needed; keep default
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS - adjust as needed for production
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['*'];
const vercelPreviewPattern = /^https:\/\/appointment-booking-application-[^\/]+\.vercel\.app$/;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With', 'X-XSRF-Token'],
  credentials: true
}));

app.use(express.json());

// Cookie parser for httpOnly JWT auth cookies
app.use(cookieParser());

// CSRF protection (must come after cookie-parser so req.cookies is populated)
app.use(csrfMiddleware);

// Request logging in development
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/csrf-token - Returns CSRF token from httpOnly cookie for frontend use
app.get('/api/csrf-token', getCsrfTokenHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/assistant', assistantRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API endpoint was not found.'
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;