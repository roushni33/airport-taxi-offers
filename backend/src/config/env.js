import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ENV = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  // Points to the read-only ../data directory in the root of the hackathon repo
  DATA_DIR: process.env.DATA_DIR || path.resolve(__dirname, '../../../data'),
  // Persistent SQLite file inside backend/state.db
  DB_FILE: process.env.DB_FILE || path.resolve(__dirname, '../../state.db'),
};

