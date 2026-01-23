import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import {
  uploadMedia,
  getMedia,
  getAllMedia,
  updateAltText,
  deleteMedia,
  updateAltTextValidation,
} from '../controllers/mediaController.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

// Upload media (authenticated users only)
router.post('/upload', authenticateToken, upload.single('file'), uploadMedia);

// Get all media with pagination
router.get('/', getAllMedia);

// Get single media by ID
router.get('/:id', getMedia);

// Update media alt text (authenticated users only)
router.patch('/:id/alt-text', authenticateToken, updateAltTextValidation, updateAltText);

// Delete media (authenticated users only)
router.delete('/:id', authenticateToken, deleteMedia);

export default router;
