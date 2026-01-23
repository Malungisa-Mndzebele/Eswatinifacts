import { pool } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Running PII encryption migration...');
    
    const migrationPath = path.join(__dirname, '../src/database/migrations/001_add_pii_encryption.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
