import { Router } from 'express';
import { register, login, getMe, demoLogin, verifyEmail, registerSchema, loginSchema } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

router.post('/register', validateRequest({ body: registerSchema }), register);
router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/demo-login', demoLogin);
router.get('/me', requireAuth, getMe);
router.get('/verify-email', verifyEmail);

export default router;