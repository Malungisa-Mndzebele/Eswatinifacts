import express from 'express';
import {
  getDashboardStats,
  listUsers,
  getUser,
  updateUser,
  updateUserValidation,
  deactivateUser,
  moderateContent,
  moderateContentValidation,
  importData,
  importDataValidation,
  getAuditLogsEndpoint,
} from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard statistics
router.get('/dashboard/stats', getDashboardStats);

// User management
router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUserValidation, updateUser);
router.delete('/users/:id', deactivateUser);

// Content moderation
router.post('/content/:id/moderate', moderateContentValidation, moderateContent);

// Data import
router.post('/data/import', importDataValidation, importData);

// Audit logs
router.get('/audit-logs', getAuditLogsEndpoint);

export default router;
