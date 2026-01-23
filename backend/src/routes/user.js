import express from 'express';
import {
  getUserProfile,
  saveContent,
  removeSavedContent,
  getSavedContent,
  saveContentValidation,
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// User profile
router.get('/profile', getUserProfile);

// Saved content management
router.post('/saved-content', saveContentValidation, saveContent);
router.get('/saved-content', getSavedContent);
router.delete('/saved-content/:id', removeSavedContent);

export default router;
