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
    { name: '002_allowed_emails', fn: migration002AllowedEmails },
    { name: '003_library_sharing', fn: migration003LibrarySharing },
    { name: '004_share_recipient_email', fn: migration004ShareRecipientEmail },
    { name: '005_analyses', fn: migration005Analyses },
    { name: '006_analyses_plural', fn: migration006AnalysesPlural },
    { name: '007_prova_oral', fn: migration007ProvaOral },
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

// Migration 002: Tabela de emails autorizados
function migration002AllowedEmails(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: allowed_emails
    -- Emails autorizados a fazer login via Magic Link
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS allowed_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_allowed_emails_email ON allowed_emails(email);
  `);
}

// Migration 003: Compartilhamento de biblioteca
function migration003LibrarySharing(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: library_shares
    -- Links de compartilhamento de biblioteca
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS library_shares (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      share_token TEXT UNIQUE NOT NULL,
      permission TEXT DEFAULT 'view',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_lib_shares_token ON library_shares(share_token);
    CREATE INDEX IF NOT EXISTS idx_lib_shares_owner ON library_shares(owner_id);

    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: library_access
    -- Acessos concedidos a bibliotecas
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS library_access (
      id TEXT PRIMARY KEY,
      share_id TEXT NOT NULL REFERENCES library_shares(id) ON DELETE CASCADE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT DEFAULT 'view',
      accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(owner_id, recipient_id)
    );

    CREATE INDEX IF NOT EXISTS idx_lib_access_recipient ON library_access(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_lib_access_owner ON library_access(owner_id);
  `);
}

// Migration 004: Email do destinatário no compartilhamento
function migration004ShareRecipientEmail(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- v1.35.1: Adicionar email do destinatário para convite direto
    -- ═══════════════════════════════════════════════════════════════
    ALTER TABLE library_shares ADD COLUMN recipient_email TEXT;
  `);
}

// Migration 005: Tabela de análises do Analisador de Prepauta
function migration005Analyses(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: analyses
    -- Análises de prepauta trabalhista (batch mode)
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      numero_processo TEXT,
      reclamante TEXT,
      reclamadas TEXT,
      nome_arquivo_peticao TEXT,
      nome_arquivo_contestacao TEXT,
      data_pauta TEXT,
      horario_audiencia TEXT,
      resultado_audiencia TEXT,
      pendencias TEXT,
      resultado TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_data_pauta ON analyses(data_pauta);
    CREATE INDEX IF NOT EXISTS idx_analyses_processo ON analyses(numero_processo);
    CREATE INDEX IF NOT EXISTS idx_analyses_deleted ON analyses(deleted_at);
  `);
}

// Migration 006: Suporte a múltiplos arquivos emenda/contestação
function migration006AnalysesPlural(db) {
  // Adicionar colunas para arrays
  db.exec(`
    ALTER TABLE analyses ADD COLUMN nomes_arquivos_emendas TEXT;
    ALTER TABLE analyses ADD COLUMN nomes_arquivos_contestacoes TEXT;
  `);

  // Migrar dados existentes (nome_arquivo_contestacao → nomes_arquivos_contestacoes)
  const analyses = db.prepare(`
    SELECT id, nome_arquivo_contestacao
    FROM analyses
    WHERE nome_arquivo_contestacao IS NOT NULL
  `).all();

  const updateStmt = db.prepare(`
    UPDATE analyses
    SET nomes_arquivos_contestacoes = ?
    WHERE id = ?
  `);

  for (const analysis of analyses) {
    updateStmt.run(JSON.stringify([analysis.nome_arquivo_contestacao]), analysis.id);
  }

  console.log(`[Database] Migration 006: Migrated ${analyses.length} analyses with contestação`);
}

// Migration 007: Tabela de análises de prova oral
function migration007ProvaOral(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: prova_oral_analyses
    -- Análises de prova oral trabalhista
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS prova_oral_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      numero_processo TEXT,
      reclamante TEXT,
      reclamada TEXT,
      vara TEXT,
      transcricao TEXT,
      sintese_processo TEXT,
      resultado TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_prova_oral_user ON prova_oral_analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_prova_oral_processo ON prova_oral_analyses(numero_processo);
    CREATE INDEX IF NOT EXISTS idx_prova_oral_deleted ON prova_oral_analyses(deleted_at);
  `);
}

// Exportar
export const getDb = () => db || initDatabase();
export { DB_PATH };
