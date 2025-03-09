import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.json' with { type: 'json' };

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
  `);
  console.log('Database initialized successfully');
  return db;
}

// Save data to database
export function saveData(userId, key, value) {
  const stmt = db.prepare('INSERT INTO saved_data (user_id, key, value) VALUES (?, ?, ?)');
  const result = stmt.run(userId, key, value);
  return result;
}

// Get data from database
export function getData(userId, key) {
  const stmt = db.prepare('SELECT * FROM saved_data WHERE user_id = ? AND key = ? ORDER BY created_at DESC LIMIT 1');
  return stmt.get(userId, key);
}

// Export database instance
export default db;