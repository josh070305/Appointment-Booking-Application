import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

// Zod validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// Mock email sender - in production, configure real SMTP via env vars
const sendVerificationEmail = async (userEmail: string, token: string): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${token}`;

  console.log('📧 EMAIL MOCK:', {
    to: userEmail,
    subject: 'Verify your email address',
    text: `Please click this link to verify your email: ${verificationUrl}`,
    html: `<p>Please click <a href="${verificationUrl}">this link</a> to verify your email address.</p>`
  });
};

function generateVerificationToken(): string {
  return jwt.sign(
    { type: 'email-verification' },
    ENV.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Send email verification link (mock implementation)
async function sendVerificationEmailLink(user: any, token: string): Promise<void> {
  await sendVerificationEmail(user.email, token);
}

// Set httpOnly JWT cookie and return success response
function setAuthCookie(res: Response, token: string): void {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError(400, 'USER_EXISTS', 'An account with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const verificationToken = generateVerificationToken();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user',
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Send verification email (mock)
    await sendVerificationEmailLink(user, verificationToken);

    // Generate token and set httpOnly cookie
    const token = generateToken(user._id.toString(), user.email, user.role);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Check if email is verified; if not, require re-login with re-sent verification
    if (!user.emailVerified) {
      const verificationToken = generateVerificationToken();
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      await sendVerificationEmailLink(user, verificationToken);
      // Indicate email verification is needed
      res.status(200).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Your email is not verified. A verification link has been sent to your email address.'
        }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const token = generateToken(user._id.toString(), user.email, user.role);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function demoLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = (req.body.email || 'demo.user@example.com').toLowerCase();
    const name = req.body.name || 'Demo User';

    let user = await User.findOne({ email });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('demopass123', salt);
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'user',
        emailVerified: true // Demo users are pre-verified
      });
    }

    // If the demo user was just created without verification, mark as verified
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.email, user.role);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash');
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found.');
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// Verify email with token
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'MISSING_TOKEN', 'Verification token is required.');
    }

    // Verify the token
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { type: string; userId: string };

    if (payload.type !== 'email-verification') {
      throw new AppError(400, 'INVALID_TOKEN', 'Invalid verification token type.');
    }

    // Find the user and update their email verification status
    const user = await User.findByIdAndUpdate(
      payload.userId,
      {
        emailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined
      },
      { new: true }
    );

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Email address verified successfully.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError(400, 'TOKEN_EXPIRED', 'Verification token has expired. Please request a new one.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError(400, 'INVALID_TOKEN', 'Invalid verification token.'));
    }
    next(error);
  }
}