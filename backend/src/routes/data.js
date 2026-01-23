import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { authenticateApiKey } from '../middleware/apiKeyAuth.js';
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  getEconomyData,
  getHealthData,
  getEducationData,
  getPoliticsData,
  getCultureData,
  dataQueryValidation,
} from '../controllers/dataController.js';

const router = express.Router();

// API Key Management Routes (require JWT authentication)
router.post('/keys', authenticateToken, generateApiKey);
router.get('/keys', authenticateToken, listApiKeys);
router.delete('/keys/:id', authenticateToken, revokeApiKey);

// Data API Routes (require API key authentication)
router.get('/economy', authenticateApiKey, dataQueryValidation, getEconomyData);
router.get('/health', authenticateApiKey, dataQueryValidation, getHealthData);
router.get('/education', authenticateApiKey, dataQueryValidation, getEducationData);
router.get('/politics', authenticateApiKey, dataQueryValidation, getPoliticsData);
router.get('/culture', authenticateApiKey, dataQueryValidation, getCultureData);

export default router;
