import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AppError } from './errorHandler.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Extract JWT from either httpOnly cookie or Bearer authorization header
function extractTokenFromRequest(req: Request): string | undefined {
  // First try httpOnly cookie
  const cookie = req.cookies?.jwt;
  if (cookie) {
    return cookie;
  }

  // Fall back to Bearer token in authorization header (for backward compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please log in again.'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid authentication token'));
  }
}

// Optional auth: sets req.user if token present, but doesn't fail if absent
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUser;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    // Token invalid but user not explicitly unauthenticated - clear stale user
    req.user = undefined;
    next();
  }
}
