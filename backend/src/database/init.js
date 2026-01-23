import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

/**
 * Drop all tables (use with caution!)
 */
export async function dropAllTables() {
  try {
    console.log('Dropping all tables...');
    
    const dropQuery = `
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS newsletters CASCADE;
      DROP TABLE IF EXISTS data_points CASCADE;
      DROP TABLE IF EXISTS data_sources CASCADE;
      DROP TABLE IF EXISTS search_index CASCADE;
      DROP TABLE IF EXISTS translations CASCADE;
      DROP TABLE IF EXISTS api_keys CASCADE;
      DROP TABLE IF EXISTS newsletter_subscriptions CASCADE;
      DROP TABLE IF EXISTS saved_content CASCADE;
      DROP TABLE IF EXISTS blog_posts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
      DROP FUNCTION IF EXISTS update_search_vector CASCADE;
    `;
    
    await pool.query(dropQuery);
    
    console.log('All tables dropped successfully');
    return true;
  } catch (error) {
    console.error('Drop tables error:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
export async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations/001_add_pii_encryption.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migration);
    
    console.log('Database migrations completed successfully');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

/**
 * Reset database (drop and recreate)
 */
export async function resetDatabase() {
  try {
    await dropAllTables();
    await initializeDatabase();
    await runMigrations();
    console.log('Database reset successfully');
    return true;
  } catch (error) {
    console.error('Database reset error:', error);
    throw error;
  }
}

// Run initialization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}
