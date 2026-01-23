import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import {
  subscribe,
  confirm,
  unsubscribe,
  getStatus,
  sendNewsletter,
  listNewsletters,
  listSubscribers,
} from '../controllers/newsletterController.js';

const router = express.Router();

// Rate limiters
const subscribeRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many subscription attempts, please try again later',
});

const unsubscribeRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many unsubscribe attempts, please try again later',
});

// Public routes
router.post('/subscribe', subscribeRateLimiter, subscribe);
router.get('/confirm/:token', confirm);
router.post('/unsubscribe', unsubscribeRateLimiter, unsubscribe);
router.get('/unsubscribe/:token', unsubscribe); // For email links
router.get('/status/:email', getStatus);

// Admin routes
router.post('/send', authenticateToken, requireAdmin, sendNewsletter);
router.get('/list', authenticateToken, requireAdmin, listNewsletters);
router.get('/subscribers', authenticateToken, requireAdmin, listSubscribers);

export default router;
