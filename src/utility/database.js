import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.json' with { type: 'json' };
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure database directory exists
const dbDir = path.dirname(path.resolve(__dirname, '..', '..', config.database));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new Database(path.resolve(__dirname, '..', '..', config.database));

// Prepared statements container
const statements = {
  saveData: null,
  getData: null,
  updateData: null,
  deleteData: null,
};

// Initialize database with required tables
export function initDatabase() {
  try {
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key)
      );
      
      -- Add indexes for frequently queried fields
      CREATE INDEX IF NOT EXISTS idx_user_key ON saved_data(user_id, key);
    `);
    
    // Prepare statements once
    statements.saveData = db.prepare(`
      INSERT INTO saved_data (user_id, key, value) 
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
    `);
    
    statements.getData = db.prepare(`
      SELECT * FROM saved_data 
      WHERE user_id = ? AND key = ? 
      ORDER BY created_at DESC LIMIT 1
    `);
    
    statements.updateData = db.prepare(`
      UPDATE saved_data SET value = ? 
      WHERE user_id = ? AND key = ?
    `);
    
    statements.deleteData = db.prepare(`
      DELETE FROM saved_data 
      WHERE user_id = ? AND key = ?
    `);
    
    logger.info('Database and prepared statements initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Update existing data in database
export function updateData(userId, key, value) {
  try {
    const result = statements.updateData.run(value, userId, key);
    return result;
  } catch (error) {
    logger.error('Error updating data:', { error: error.message, userId, key });
    return { changes: 0 };
  }
}

// Save data with optimized upsert operation
export function saveData(userId, key, value) {
  try {
    // Direct upsert using prepared statement (replaces check-then-update pattern)
    const result = statements.saveData.run(userId, key, value, value);
    return result;
  } catch (error) {
    logger.error('Error saving data:', { error: error.message, userId, key });
    return { changes: 0 };
  }
}

// Get data from database
export function getData(userId, key) {
  try {
    return statements.getData.get(userId, key);
  } catch (error) {
    logger.error('Error getting data:', { error: error.message, userId, key });
    return null;
  }
}

// Delete data from database
export function deleteData(userId, key) {
  try {
    const result = statements.deleteData.run(userId, key);
    return result;
  } catch (error) {
    logger.error('Error deleting data:', { error: error.message, userId, key });
    return { changes: 0 };
  }
}

// Export database instance
export default db;