import express from 'express';
import {
  getMultiCategoryData,
  getCountryComparison,
  exportData,
  saveFilterConfiguration,
  loadFilterConfiguration,
} from '../controllers/visualizationController.js';

const router = express.Router();

/**
 * @route   GET /api/v1/visualization/multi-category
 * @desc    Get aggregated data across multiple categories
 * @access  Public
 * @query   categories - Comma-separated list of categories
 * @query   startDate - Optional start date filter
 * @query   endDate - Optional end date filter
 */
router.get('/multi-category', getMultiCategoryData);

/**
 * @route   GET /api/v1/visualization/country-comparison
 * @desc    Get country comparison data
 * @access  Public
 * @query   countries - Comma-separated list of countries (Eswatini auto-included)
 * @query   startDate - Optional start date filter
 * @query   endDate - Optional end date filter
 * @query   category - Optional category filter
 */
router.get('/country-comparison', getCountryComparison);

/**
 * @route   GET /api/v1/visualization/export
 * @desc    Export filtered data in CSV or JSON format
 * @access  Public
 * @query   format - Export format (csv or json)
 * @query   categories - Optional comma-separated list of categories
 * @query   countries - Optional comma-separated list of countries
 * @query   startDate - Optional start date filter
 * @query   endDate - Optional end date filter
 */
router.get('/export', exportData);

/**
 * @route   POST /api/v1/visualization/filter-config
 * @desc    Save filter configuration and get shareable URL
 * @access  Public
 * @body    name - Optional name for the filter configuration
 * @body    filters - Filter configuration object
 */
router.post('/filter-config', saveFilterConfiguration);

/**
 * @route   GET /api/v1/visualization/filter-config/:configId
 * @desc    Load saved filter configuration
 * @access  Public
 * @param   configId - Configuration ID
 */
router.get('/filter-config/:configId', loadFilterConfiguration);

export default router;
