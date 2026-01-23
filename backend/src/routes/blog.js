import express from 'express';
import {
  createPost,
  updatePost,
  publishPost,
  getPosts,
  getPost,
  deletePost,
  createPostValidation,
  updatePostValidation,
} from '../controllers/blogController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes (with optional auth for unpublished content access)
router.get('/', optionalAuth, getPosts);
router.get('/:identifier', optionalAuth, getPost);

// Protected routes (require authentication)
router.post('/', authenticateToken, createPostValidation, createPost);
router.put('/:id', authenticateToken, updatePostValidation, updatePost);
router.post('/:id/publish', authenticateToken, publishPost);
router.delete('/:id', authenticateToken, deletePost);

export default router;
