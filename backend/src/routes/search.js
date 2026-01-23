import express from 'express';
import { search, searchValidation } from '../controllers/searchController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to search endpoint
router.use(apiLimiter);

/**
 * @route   GET /api/v1/search
 * @desc    Search across all content
 * @access  Public
 * @query   q - Search query string
 * @query   categories - Category filter (string or array)
 * @query   sort - Sort order (relevance, date, title)
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 10, max: 100)
 */
router.get('/', searchValidation, search);

export default router;
