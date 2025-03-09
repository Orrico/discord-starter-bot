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

// Initialize database with required tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Add indexes for frequently queried fields
    CREATE INDEX IF NOT EXISTS idx_user_key ON saved_data(user_id, key);
  `);
  logger.info('Database initialized successfully');
  return db;
}

// Update existing data in database
export function updateData(userId, key, value) {
  const stmt = db.prepare('UPDATE saved_data SET value = ? WHERE user_id = ? AND key = ?');
  const result = stmt.run(value, userId, key);
  return result;
}

// Save or update data in database
export function saveData(userId, key, value) {
  // Check if data exists
  const existing = getData(userId, key);
  
  if (existing) {
    // Update existing data
    return updateData(userId, key, value);
  } else {
    // Insert new data
    const stmt = db.prepare('INSERT INTO saved_data (user_id, key, value) VALUES (?, ?, ?)');
    return stmt.run(userId, key, value);
  }
}

// Get data from database
export function getData(userId, key) {
  const stmt = db.prepare('SELECT * FROM saved_data WHERE user_id = ? AND key = ? ORDER BY created_at DESC LIMIT 1');
  return stmt.get(userId, key);
}

// Delete data from database
export function deleteData(userId, key) {
  const stmt = db.prepare('DELETE FROM saved_data WHERE user_id = ? AND key = ?');
  const result = stmt.run(userId, key);
  return result;
}

// Export database instance
export default db;