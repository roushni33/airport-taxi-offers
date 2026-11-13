import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedDataDir = path.resolve(__dirname, '../../../shared/data');
const fallbackDataDir = path.resolve(__dirname, '../../../data');

export const ENV = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  // Points to shared/data or data directory
  DATA_DIR: process.env.DATA_DIR || (fs.existsSync(sharedDataDir) ? sharedDataDir : fallbackDataDir),
  // Persistent SQLite file inside backend/state.db
  DB_FILE: process.env.DB_FILE || path.resolve(__dirname, '../../state.db'),
};

