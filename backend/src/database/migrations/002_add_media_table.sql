-- Migration: Add media table for image uploads
-- Date: 2025-01-01

-- Media Table
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  storage_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_mime_type ON media(mime_type);
CREATE INDEX idx_media_created_at ON media(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
