import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

/**
 * Rate limiter for authentication endpoints to prevent brute-force attacks.
 * In development, we allow a higher limit to avoid interfering with development.
 * In production, we enforce a strict limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: ENV.NODE_ENV === 'production' ? 5 : 10000, // 5 for production, 10000 for development (effectively off)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false
});

/**
 * General API rate limiter (optional)
 * Allows 100 requests per 15 minutes per IP.
 * In development, we increase the limit to avoid interfering with development.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV.NODE_ENV === 'production' ? 100 : 10000,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Booking endpoint rate limiter
 * Protects against bot spam and abuse while allowing normal booking races
 */
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: ENV.NODE_ENV === 'production' ? 15 : 10000, // 15 attempts per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many booking requests. Please wait a moment before trying again.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});