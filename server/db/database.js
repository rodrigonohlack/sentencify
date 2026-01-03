// server/db/database.js - Conexão SQLite + Migrations
// v1.0.0 - Persistência de modelos com Magic Link

import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path do banco (Render Persistent Disk: /sentencify/sentencify.db)
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/sentencify.db');

// Garantir que o diretório existe
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

let db;

export const initDatabase = () => {
  if (db) return db;

  db = new Database(DB_PATH);

  // Otimizações SQLite
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Executar migrations
  runMigrations();

  console.log(`[Database] SQLite initialized at ${DB_PATH}`);
  return db;
};

const runMigrations = () => {
  // Tabela de controle de migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Lista de migrations
  const migrations = [
    { name: '001_initial', fn: migration001Initial },
  ];

  const applied = db.prepare('SELECT name FROM migrations').all().map(r => r.name);

  for (const { name, fn } of migrations) {
    if (!applied.includes(name)) {
      console.log(`[Database] Running migration: ${name}`);
      fn(db);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
    }
  }
};

// Migration 001: Schema inicial
function migration001Initial(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: users
    -- Usuários autenticados via magic link
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: magic_links
    -- Tokens de login (válidos por 15 minutos)
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      used_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
    CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: refresh_tokens
    -- Tokens de renovação (válidos por 30 dias)
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: models
    -- Modelos do usuário (soft delete)
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      keywords TEXT,
      is_favorite INTEGER DEFAULT 0,
      embedding BLOB,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      sync_version INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_models_user ON models(user_id);
    CREATE INDEX IF NOT EXISTS idx_models_updated ON models(updated_at);
    CREATE INDEX IF NOT EXISTS idx_models_deleted ON models(deleted_at);

    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: sync_log
    -- Log de operações para sync incremental
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      operation TEXT NOT NULL,
      model_id TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      sync_version INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_log_user_timestamp ON sync_log(user_id, timestamp);
  `);
}

// Exportar
export const getDb = () => db || initDatabase();
export { DB_PATH };
