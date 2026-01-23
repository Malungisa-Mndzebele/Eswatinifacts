import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  requestPasswordReset,
  resetPassword,
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/password-reset/request', authLimiter, passwordResetRequestValidation, requestPasswordReset);
router.post('/password-reset/confirm', authLimiter, passwordResetValidation, resetPassword);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

export default router;
