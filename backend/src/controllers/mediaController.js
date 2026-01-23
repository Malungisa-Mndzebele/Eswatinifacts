import { body, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure upload directories exist
async function ensureUploadDirs() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
}

// Initialize directories
ensureUploadDirs();

/**
 * Validation rules for updating media alt text
 */
export const updateAltTextValidation = [
  body('altText')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Alt text must not exceed 1000 characters'),
];

/**
 * Process and optimize uploaded image
 */
async function processImage(file, userId) {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}-${randomString}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Read image metadata
    const metadata = await sharp(file.buffer).metadata();

    // Optimize and convert to WebP
    const webpFilename = filename.replace(ext, '.webp');
    const webpFilepath = path.join(UPLOAD_DIR, webpFilename);

    await sharp(file.buffer)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(webpFilepath);

    // Create thumbnail
    const thumbnailFilename = `thumb-${webpFilename}`;
    const thumbnailFilepath = path.join(THUMBNAIL_DIR, thumbnailFilename);

    await sharp(file.buffer)
      .resize(400, 400, {
        fit: 'cover',
      })
      .webp({ quality: 80 })
      .toFile(thumbnailFilepath);

    // Get file size
    const stats = await fs.stat(webpFilepath);

    // Save to database
    const result = await pool.query(
      `INSERT INTO media 
       (filename, original_filename, mime_type, file_size, width, height, storage_path, thumbnail_path, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, filename, original_filename, mime_type, file_size, width, height, alt_text, storage_path, thumbnail_path, uploaded_by, created_at, updated_at`,
      [
        webpFilename,
        file.originalname,
        'image/webp',
        stats.size,
        metadata.width,
        metadata.height,
        webpFilepath,
        thumbnailFilepath,
        userId,
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
}

/**
 * Upload media file
 */
export async function uploadMedia(req, res) {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file was uploaded',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Only image files (JPEG, PNG, WebP, GIF) are allowed',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size must not exceed 10MB',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Process image
    const media = await processImage(req.file, req.user.id);

    res.status(201).json({
      success: true,
      data: {
        media: {
          id: media.id,
          filename: media.filename,
          originalFilename: media.original_filename,
          mimeType: media.mime_type,
          fileSize: media.file_size,
          width: media.width,
          height: media.height,
          altText: media.alt_text,
          url: `/uploads/${media.filename}`,
          thumbnailUrl: `/uploads/thumbnails/thumb-${media.filename}`,
          uploadedBy: media.uploaded_by,
          createdAt: media.created_at,
          updatedAt: media.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload media',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get media by ID
 */
export async function getMedia(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM media WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'Media not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const media = result.rows[0];

    res.json({
      success: true,
      data: {
        media: {
          id: media.id,
          filename: media.filename,
          originalFilename: media.original_filename,
          mimeType: media.mime_type,
          fileSize: media.file_size,
          width: media.width,
          height: media.height,
          altText: media.alt_text,
          url: `/uploads/${media.filename}`,
          thumbnailUrl: `/uploads/thumbnails/thumb-${media.filename}`,
          uploadedBy: media.uploaded_by,
          createdAt: media.created_at,
          updatedAt: media.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get media',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get all media with pagination
 */
export async function getAllMedia(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      uploadedBy,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (uploadedBy) {
      conditions.push(`uploaded_by = $${paramCount}`);
      values.push(uploadedBy);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM media ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get media
    values.push(parseInt(limit));
    values.push(offset);

    const result = await pool.query(
      `SELECT * FROM media
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const media = result.rows.map((m) => ({
      id: m.id,
      filename: m.filename,
      originalFilename: m.original_filename,
      mimeType: m.mime_type,
      fileSize: m.file_size,
      width: m.width,
      height: m.height,
      altText: m.alt_text,
      url: `/uploads/${m.filename}`,
      thumbnailUrl: `/uploads/thumbnails/thumb-${m.filename}`,
      uploadedBy: m.uploaded_by,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get all media error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get media',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Update media alt text
 */
export async function updateAltText(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { id } = req.params;
    const { altText } = req.body;

    // Check if media exists
    const existingMedia = await pool.query(
      'SELECT uploaded_by FROM media WHERE id = $1',
      [id]
    );

    if (existingMedia.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'Media not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check authorization (only uploader or admin can update)
    if (
      existingMedia.rows[0].uploaded_by !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this media',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update alt text
    const result = await pool.query(
      `UPDATE media 
       SET alt_text = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [altText, id]
    );

    const media = result.rows[0];

    res.json({
      success: true,
      data: {
        media: {
          id: media.id,
          filename: media.filename,
          originalFilename: media.original_filename,
          mimeType: media.mime_type,
          fileSize: media.file_size,
          width: media.width,
          height: media.height,
          altText: media.alt_text,
          url: `/uploads/${media.filename}`,
          thumbnailUrl: `/uploads/thumbnails/thumb-${media.filename}`,
          uploadedBy: media.uploaded_by,
          createdAt: media.created_at,
          updatedAt: media.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Update alt text error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update alt text',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Delete media
 */
export async function deleteMedia(req, res) {
  try {
    const { id } = req.params;

    // Check if media exists
    const existingMedia = await pool.query(
      'SELECT uploaded_by, storage_path, thumbnail_path FROM media WHERE id = $1',
      [id]
    );

    if (existingMedia.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'Media not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check authorization (only uploader or admin can delete)
    if (
      existingMedia.rows[0].uploaded_by !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this media',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Delete files from storage
    try {
      await fs.unlink(existingMedia.rows[0].storage_path);
      if (existingMedia.rows[0].thumbnail_path) {
        await fs.unlink(existingMedia.rows[0].thumbnail_path);
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await pool.query('DELETE FROM media WHERE id = $1', [id]);

    res.json({
      success: true,
      data: {
        message: 'Media deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete media',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export { UPLOAD_DIR, THUMBNAIL_DIR };
