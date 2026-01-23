import express from 'express';
import {
  getTranslations,
  getContentWithTranslations,
  createOrUpdateTranslation,
  deleteTranslation,
  getAvailableLocales,
  detectLanguage,
  bulkCreateTranslations,
} from '../controllers/translationController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Translation Routes
 * Base path: /api/v1/translations
 */

// Public routes
router.get('/locales', getAvailableLocales);
router.get('/detect-language', detectLanguage);
router.get('/content/:contentType/:contentId', getContentWithTranslations);
router.get('/:contentType/:contentId', getTranslations);

// Admin routes (require authentication and admin role)
router.post('/', authenticateToken, requireAdmin, createOrUpdateTranslation);
router.post('/bulk', authenticateToken, requireAdmin, bulkCreateTranslations);
router.delete('/:id', authenticateToken, requireAdmin, deleteTranslation);

export default router;
