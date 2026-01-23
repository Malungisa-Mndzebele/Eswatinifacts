-- Migration: Add PII encryption support
-- This migration updates the users and newsletter_subscriptions tables to store encrypted PII

-- Step 1: Add new columns for encrypted data
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_encrypted TEXT;

ALTER TABLE newsletter_subscriptions ADD COLUMN IF NOT EXISTS email_encrypted TEXT;

-- Step 2: Create indexes on encrypted columns for performance
-- Note: We can't use unique indexes on encrypted data, so we'll need to handle uniqueness in application logic
CREATE INDEX IF NOT EXISTS idx_users_email_encrypted ON users(email_encrypted);
CREATE INDEX IF NOT EXISTS idx_newsletter_email_encrypted ON newsletter_subscriptions(email_encrypted);

-- Step 3: Add a flag to track migration status
ALTER TABLE users ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE newsletter_subscriptions ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT FALSE;

-- Note: The actual data migration (encrypting existing data) should be done via a separate script
-- that uses the application's encryption utilities to ensure consistency
