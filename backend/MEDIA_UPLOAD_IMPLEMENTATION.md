# Media Upload and Optimization Implementation

## Overview

This document describes the implementation of the media upload and optimization system for the Eswatini Facts Platform. The system allows authenticated users to upload images, which are automatically optimized, converted to WebP format, and stored with thumbnails.

## Features Implemented

### 1. Image Upload Endpoint
- **Endpoint**: `POST /api/v1/media/upload`
- **Authentication**: Required (JWT token)
- **File Handling**: Uses multer with memory storage
- **Supported Formats**: JPEG, PNG, WebP, GIF
- **Max File Size**: 10MB

### 2. Image Optimization
- **Library**: Sharp
- **Optimizations**:
  - Automatic conversion to WebP format (85% quality)
  - Resize to max 2000x2000px (maintains aspect ratio)
  - Thumbnail generation (400x400px, cover fit, 80% quality)
  - Metadata extraction (width, height)

### 3. File Storage
- **Storage Type**: Local filesystem (configurable via `UPLOAD_DIR` env variable)
- **Directory Structure**:
  ```
  uploads/
  ├── {timestamp}-{random}.webp (optimized images)
  └── thumbnails/
      └── thumb-{timestamp}-{random}.webp (thumbnails)
  ```
- **Future Enhancement**: Can be extended to support S3-compatible storage

### 4. Alt Text Management
- **Endpoint**: `PATCH /api/v1/media/:id/alt-text`
- **Authentication**: Required (uploader or admin)
- **Validation**: Max 1000 characters
- **Database Storage**: Stored in `media.alt_text` column

### 5. Media Retrieval
- **Get Single**: `GET /api/v1/media/:id`
- **Get All**: `GET /api/v1/media?page=1&limit=20&uploadedBy={userId}`
- **Pagination**: Supported with page and limit parameters
- **Filtering**: By uploader ID

### 6. Media Deletion
- **Endpoint**: `DELETE /api/v1/media/:id`
- **Authentication**: Required (uploader or admin)
- **Cleanup**: Deletes both database record and physical files

## Database Schema

### Media Table

```sql
CREATE TABLE media (
  id UUID PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  storage_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes

- `idx_media_uploaded_by` - For filtering by uploader
- `idx_media_mime_type` - For filtering by file type
- `idx_media_created_at` - For sorting by upload date

## API Endpoints

### Upload Media

```http
POST /api/v1/media/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary image data]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "media": {
      "id": "uuid",
      "filename": "1234567890-abc123.webp",
      "originalFilename": "photo.jpg",
      "mimeType": "image/webp",
      "fileSize": 123456,
      "width": 1920,
      "height": 1080,
      "altText": null,
      "url": "/uploads/1234567890-abc123.webp",
      "thumbnailUrl": "/uploads/thumbnails/thumb-1234567890-abc123.webp",
      "uploadedBy": "user-uuid",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

### Get Media

```http
GET /api/v1/media/:id
```

### Get All Media

```http
GET /api/v1/media?page=1&limit=20&uploadedBy={userId}
```

### Update Alt Text

```http
PATCH /api/v1/media/:id/alt-text
Authorization: Bearer {token}
Content-Type: application/json

{
  "altText": "Description of the image"
}
```

### Delete Media

```http
DELETE /api/v1/media/:id
Authorization: Bearer {token}
```

## Security Features

1. **Authentication Required**: All upload, update, and delete operations require authentication
2. **Authorization**: Only the uploader or admin can update/delete media
3. **File Type Validation**: Only image files are accepted
4. **File Size Limit**: 10MB maximum
5. **Input Validation**: Alt text length validation

## Error Handling

### Common Error Codes

- `NO_FILE` - No file was uploaded
- `INVALID_FILE_TYPE` - File type not allowed
- `FILE_TOO_LARGE` - File exceeds size limit
- `MEDIA_NOT_FOUND` - Media ID not found
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input data
- `INTERNAL_ERROR` - Server error

## Configuration

### Environment Variables

```env
# Upload directory (default: backend/uploads)
UPLOAD_DIR=/path/to/uploads

# Server configuration
PORT=3000
API_URL=http://localhost:3000
```

## Usage Example

### Frontend Integration

```javascript
// Upload image
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/v1/media/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json();
  return result.data.media;
}

// Update alt text
async function updateAltText(mediaId, altText) {
  const response = await fetch(`/api/v1/media/${mediaId}/alt-text`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ altText }),
  });

  return await response.json();
}
```

## Migration

To add the media table to an existing database:

```bash
node backend/scripts/run-migration.js 002_add_media_table.sql
```

## Testing

The media upload system should be tested with:

1. **Valid uploads**: JPEG, PNG, WebP, GIF files
2. **Invalid uploads**: Non-image files, oversized files
3. **Alt text updates**: Valid and invalid lengths
4. **Authorization**: Uploader vs non-uploader access
5. **File cleanup**: Verify files are deleted on media deletion

## Future Enhancements

1. **S3 Storage**: Add support for cloud storage (AWS S3, DigitalOcean Spaces)
2. **Image Variants**: Generate multiple sizes for responsive images
3. **Bulk Upload**: Support uploading multiple files at once
4. **Image Editing**: Basic cropping and rotation
5. **CDN Integration**: Serve images through CDN
6. **Metadata Extraction**: EXIF data extraction and storage
7. **Image Search**: Search media by alt text or filename

## Requirements Validation

This implementation satisfies **Requirement 4.2**:

> WHEN an Administrator uploads images for a post THEN the Platform SHALL optimize and store the images with appropriate alt text

✅ Image upload endpoint created  
✅ Image optimization with Sharp (resize, compress, WebP conversion)  
✅ File storage integration (local filesystem)  
✅ Alt text management in database  
✅ Media routes added to server  

## Related Files

- `backend/src/controllers/mediaController.js` - Media controller logic
- `backend/src/routes/media.js` - Media API routes
- `backend/src/database/schema.sql` - Database schema with media table
- `backend/src/database/migrations/002_add_media_table.sql` - Migration file
- `backend/src/server.js` - Server configuration with media routes
