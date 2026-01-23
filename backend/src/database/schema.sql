-- Eswatini Facts Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  email_verified BOOLEAN DEFAULT FALSE,
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(100),
  tags TEXT[],
  featured_image VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);

-- Saved Content Table
CREATE TABLE IF NOT EXISTS saved_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

CREATE INDEX idx_saved_content_user ON saved_content(user_id);
CREATE INDEX idx_saved_content_type ON saved_content(content_type);

-- Newsletter Subscriptions Table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirmation_token VARCHAR(255),
  confirmed_at TIMESTAMP,
  categories TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  unsubscribed_at TIMESTAMP,
  CONSTRAINT email_format_newsletter CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_status ON newsletter_subscriptions(status);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  rate_limit INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Translations Table
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  translated_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_type, content_id, locale, field_name)
);

CREATE INDEX idx_translations_content ON translations(content_type, content_id);
CREATE INDEX idx_translations_locale ON translations(locale);

-- Search Index Table
CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  content TEXT,
  category VARCHAR(100),
  url VARCHAR(500),
  search_vector tsvector,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_type, content_id)
);

CREATE INDEX idx_search_vector ON search_index USING GIN(search_vector);
CREATE INDEX idx_search_content_type ON search_index(content_type);
CREATE INDEX idx_search_category ON search_index(category);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Data Sources Table (for statistical data)
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(500),
  category VARCHAR(100),
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_sources_category ON data_sources(category);

-- Data Points Table (for statistical data)
CREATE TABLE IF NOT EXISTS data_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  metric_name VARCHAR(255) NOT NULL,
  metric_value NUMERIC,
  metric_unit VARCHAR(50),
  date_recorded DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_points_source ON data_points(source_id);
CREATE INDEX idx_data_points_category ON data_points(category);
CREATE INDEX idx_data_points_date ON data_points(date_recorded);
CREATE INDEX idx_data_points_metric ON data_points(metric_name);

-- Newsletters Table
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  recipient_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_newsletters_scheduled ON newsletters(scheduled_for);
CREATE INDEX idx_newsletters_sent ON newsletters(sent_at);

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_index_updated_at BEFORE UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for search vector
CREATE TRIGGER update_search_index_vector BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
