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
    { name: '008_prova_oral_sharing', fn: migration008ProvaOralSharing },
    { name: '009_analyses_observacoes', fn: migration009AnalysesObservacoes },
    { name: '010_analyses_sintese', fn: migration010AnalysesSintese },
    { name: '011_noticias', fn: migration011Noticias },
    { name: '012_financeiro', fn: migration012Financeiro },
    { name: '013_financeiro_accents', fn: migration013FinanceiroAccents },
    { name: '014_financeiro_new_categories', fn: migration014FinanceiroNewCategories },
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

// Migration 008: Compartilhamento de análises de prova oral
function migration008ProvaOralSharing(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: prova_oral_access
    -- Compartilhamento global de análises de prova oral
    -- owner_id compartilha TODAS as suas análises com recipient_id
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS prova_oral_access (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(owner_id, recipient_id)
    );

    CREATE INDEX IF NOT EXISTS idx_prova_oral_access_owner
      ON prova_oral_access(owner_id);
    CREATE INDEX IF NOT EXISTS idx_prova_oral_access_recipient
      ON prova_oral_access(recipient_id);
  `);
}

// Migration 009: Campo de observações nas análises
function migration009AnalysesObservacoes(db) {
  db.exec(`
    ALTER TABLE analyses ADD COLUMN observacoes TEXT;
  `);
  console.log('[Database] Migration 009: Added observacoes column to analyses');
}

// Migration 010: Campo de síntese nas análises
function migration010AnalysesSintese(db) {
  db.exec(`
    ALTER TABLE analyses ADD COLUMN sintese TEXT;
  `);
  console.log('[Database] Migration 010: Added sintese column to analyses');
}

// Migration 011: Tabelas de notícias jurídicas
function migration011Noticias(db) {
  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: noticias
    -- Notícias jurídicas coletadas de fontes RSS
    -- Resumos IA são COMPARTILHADOS entre todos os usuários
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS noticias (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT,
      link TEXT NOT NULL UNIQUE,
      published_at TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      themes TEXT,
      ai_summary TEXT,
      ai_summary_generated_at TEXT,
      ai_summary_generated_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_noticias_published ON noticias(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_noticias_source ON noticias(source_id);
    CREATE INDEX IF NOT EXISTS idx_noticias_link ON noticias(link);

    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: noticias_favoritos
    -- Favoritos POR USUÁRIO
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS noticias_favoritos (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      noticia_id TEXT NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, noticia_id)
    );

    CREATE INDEX IF NOT EXISTS idx_noticias_fav_user ON noticias_favoritos(user_id);

    -- ═══════════════════════════════════════════════════════════════
    -- TABELA: noticias_lidas
    -- Histórico de leitura POR USUÁRIO
    -- ═══════════════════════════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS noticias_lidas (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      noticia_id TEXT NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
      read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, noticia_id)
    );

    CREATE INDEX IF NOT EXISTS idx_noticias_lidas_user ON noticias_lidas(user_id);
  `);
  console.log('[Database] Migration 011: Created noticias tables');
}

// Migration 012: Tabelas do módulo Financeiro (GER_DESPESAS)
function migration012Financeiro(db) {
  // Categorias fixas (14)
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
  `);

  const categories = [
    { id: 'alimentacao', name: 'Alimentação', icon: 'UtensilsCrossed', color: '#f97316', sort_order: 1 },
    { id: 'saude', name: 'Saúde', icon: 'Heart', color: '#ef4444', sort_order: 2 },
    { id: 'transporte', name: 'Transporte', icon: 'Car', color: '#3b82f6', sort_order: 3 },
    { id: 'combustivel', name: 'Combustível', icon: 'Fuel', color: '#f59e0b', sort_order: 4 },
    { id: 'moradia', name: 'Moradia', icon: 'Home', color: '#8b5cf6', sort_order: 5 },
    { id: 'assinaturas_tech', name: 'Assinaturas / Tech', icon: 'Monitor', color: '#6366f1', sort_order: 6 },
    { id: 'vestuario', name: 'Vestuário', icon: 'Shirt', color: '#ec4899', sort_order: 7 },
    { id: 'lazer', name: 'Lazer', icon: 'Gamepad2', color: '#a855f7', sort_order: 8 },
    { id: 'educacao', name: 'Educação', icon: 'GraduationCap', color: '#14b8a6', sort_order: 9 },
    { id: 'viagem', name: 'Viagem', icon: 'Plane', color: '#06b6d4', sort_order: 10 },
    { id: 'compras_gerais', name: 'Compras Gerais', icon: 'ShoppingBag', color: '#f43f5e', sort_order: 11 },
    { id: 'servicos', name: 'Serviços', icon: 'Wrench', color: '#64748b', sort_order: 12 },
    { id: 'automovel', name: 'Automóvel', icon: 'CarFront', color: '#d97706', sort_order: 13 },
    { id: 'outros', name: 'Outros', icon: 'CircleDot', color: '#94a3b8', sort_order: 14 },
  ];

  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)');
  for (const cat of categories) {
    insertCat.run(cat.id, cat.name, cat.icon, cat.color, cat.sort_order);
  }

  // Importações CSV
  db.exec(`
    CREATE TABLE IF NOT EXISTS csv_imports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      imported_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, file_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_csv_imports_user ON csv_imports(user_id);
    CREATE INDEX IF NOT EXISTS idx_csv_imports_hash ON csv_imports(file_hash);
  `);

  // Despesas (tabela principal)
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csv_import_id TEXT REFERENCES csv_imports(id) ON DELETE SET NULL,
      purchase_date TEXT NOT NULL,
      card_holder TEXT,
      card_last_four TEXT,
      bank_category TEXT,
      description TEXT NOT NULL,
      installment TEXT,
      value_usd REAL DEFAULT 0,
      exchange_rate REAL DEFAULT 0,
      value_brl REAL NOT NULL,
      category_id TEXT REFERENCES categories(id),
      category_source TEXT DEFAULT 'bank',
      category_confidence REAL,
      source TEXT NOT NULL DEFAULT 'csv',
      recurring_expense_id TEXT,
      is_refund INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_holder ON expenses(card_holder);
    CREATE INDEX IF NOT EXISTS idx_expenses_card ON expenses(card_last_four);
    CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source);
    CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_duplicate ON expenses(user_id, purchase_date, description, value_brl, card_last_four);
  `);

  // Despesas recorrentes
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      value_brl REAL NOT NULL,
      category_id TEXT REFERENCES categories(id),
      due_day INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_expenses(is_active);
  `);

  // Configurações do financeiro
  db.exec(`
    CREATE TABLE IF NOT EXISTS financeiro_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferred_provider TEXT DEFAULT 'gemini',
      default_view TEXT DEFAULT 'dashboard',
      reminder_days INTEGER DEFAULT 3,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('[Database] Migration 012: Created financeiro tables (categories, csv_imports, expenses, recurring_expenses, financeiro_settings)');
}

// Migration 013: Fix accents in category names
function migration013FinanceiroAccents(db) {
  const updates = [
    { id: 'alimentacao', name: 'Alimentação' },
    { id: 'saude', name: 'Saúde' },
    { id: 'combustivel', name: 'Combustível' },
    { id: 'vestuario', name: 'Vestuário' },
    { id: 'educacao', name: 'Educação' },
    { id: 'servicos', name: 'Serviços' },
    { id: 'automovel', name: 'Automóvel' },
  ];

  const stmt = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
  for (const { id, name } of updates) {
    stmt.run(name, id);
  }
  console.log('[Database] Migration 013: Fixed category name accents');
}

// Migration 014: Add Investimento and Empréstimo categories
function migration014FinanceiroNewCategories(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?)');
  insert.run('investimento', 'Investimento', 'TrendingUp', '#22c55e', 14);
  insert.run('emprestimo', 'Empréstimo', 'Landmark', '#0ea5e9', 15);
  db.prepare('UPDATE categories SET sort_order = 16 WHERE id = ?').run('outros');
  console.log('[Database] Migration 014: Added Investimento and Empréstimo categories');
}

// Exportar
export const getDb = () => db || initDatabase();
export { DB_PATH };
