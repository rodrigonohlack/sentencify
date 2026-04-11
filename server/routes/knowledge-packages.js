// server/routes/knowledge-packages.js - CRUD de Pacotes de Conhecimento
// v1.40.34

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Aplicar auth em todas as rotas
router.use('/api/knowledge-packages', authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: busca pacotes com arquivos inline
// ─────────────────────────────────────────────────────────────────────────────
function getPackagesWithFiles(db, userId) {
  const packages = db.prepare(`
    SELECT id, name, description, instructions,
           created_at, updated_at, sync_version
    FROM knowledge_packages
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `).all(userId);

  const filesStmt = db.prepare(`
    SELECT id, package_id, name, content, file_size, created_at
    FROM knowledge_package_files
    WHERE package_id = ?
    ORDER BY created_at ASC
  `);

  return packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description || '',
    instructions: pkg.instructions || '',
    createdAt: pkg.created_at,
    updatedAt: pkg.updated_at,
    syncVersion: pkg.sync_version,
    files: filesStmt.all(pkg.id).map(f => ({
      id: f.id,
      packageId: f.package_id,
      name: f.name,
      content: f.content,
      fileSize: f.file_size,
      createdAt: f.created_at,
    })),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/knowledge-packages
// Lista todos os pacotes do usuário com arquivos inline
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/knowledge-packages', (req, res) => {
  try {
    const db = getDb();
    const result = getPackagesWithFiles(db, req.user.id);
    res.json({ packages: result, count: result.length });
  } catch (error) {
    console.error('[KnowledgePackages] List error:', error);
    res.status(500).json({ error: 'Erro ao listar pacotes de conhecimento' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/knowledge-packages
// Cria um novo pacote (opcionalmente com arquivos)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/knowledge-packages', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { name, description, instructions, files } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do pacote é obrigatório' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO knowledge_packages (id, user_id, name, description, instructions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name.trim(), description?.trim() || null, instructions?.trim() || null, now, now);

    // Inserir arquivos se fornecidos
    if (Array.isArray(files) && files.length > 0) {
      const fileStmt = db.prepare(`
        INSERT INTO knowledge_package_files (id, package_id, user_id, name, content, file_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const f of files) {
        if (f.name && f.content) {
          fileStmt.run(uuidv4(), id, userId, f.name.trim(), f.content, f.content.length, now);
        }
      }
    }

    res.status(201).json({ id, message: 'Pacote criado com sucesso' });
  } catch (error) {
    console.error('[KnowledgePackages] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar pacote de conhecimento' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/knowledge-packages/:id
// Atualiza nome/descrição/instruções de um pacote
// ─────────────────────────────────────────────────────────────────────────────
router.put('/api/knowledge-packages/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, instructions } = req.body;

    const pkg = db.prepare(
      'SELECT id FROM knowledge_packages WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    ).get(id, userId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do pacote é obrigatório' });
    }

    db.prepare(`
      UPDATE knowledge_packages
      SET name = ?, description = ?, instructions = ?,
          updated_at = ?, sync_version = sync_version + 1
      WHERE id = ? AND user_id = ?
    `).run(
      name.trim(),
      description?.trim() || null,
      instructions?.trim() || null,
      new Date().toISOString(),
      id, userId
    );

    res.json({ message: 'Pacote atualizado com sucesso' });
  } catch (error) {
    console.error('[KnowledgePackages] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar pacote de conhecimento' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/knowledge-packages/:id
// Soft delete de um pacote
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/api/knowledge-packages/:id', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id } = req.params;

    const pkg = db.prepare(
      'SELECT id FROM knowledge_packages WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    ).get(id, userId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    db.prepare(`
      UPDATE knowledge_packages SET deleted_at = ? WHERE id = ? AND user_id = ?
    `).run(new Date().toISOString(), id, userId);

    res.json({ message: 'Pacote excluído com sucesso' });
  } catch (error) {
    console.error('[KnowledgePackages] Delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir pacote de conhecimento' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/knowledge-packages/:id/files
// Adiciona um arquivo de texto ao pacote
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/knowledge-packages/:id/files', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id: packageId } = req.params;
    const { name, content } = req.body;

    const pkg = db.prepare(
      'SELECT id FROM knowledge_packages WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    ).get(packageId, userId);

    if (!pkg) {
      return res.status(404).json({ error: 'Pacote não encontrado' });
    }

    if (!name?.trim() || !content) {
      return res.status(400).json({ error: 'Nome e conteúdo do arquivo são obrigatórios' });
    }

    const fileId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO knowledge_package_files (id, package_id, user_id, name, content, file_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fileId, packageId, userId, name.trim(), content, content.length, now);

    // Atualizar updated_at do pacote
    db.prepare('UPDATE knowledge_packages SET updated_at = ? WHERE id = ?').run(now, packageId);

    res.status(201).json({
      id: fileId,
      packageId,
      name: name.trim(),
      content,
      fileSize: content.length,
      createdAt: now,
    });
  } catch (error) {
    console.error('[KnowledgePackages] AddFile error:', error);
    res.status(500).json({ error: 'Erro ao adicionar arquivo ao pacote' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/knowledge-packages/:id/files/:fileId
// Remove um arquivo do pacote
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/api/knowledge-packages/:id/files/:fileId', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { id: packageId, fileId } = req.params;

    const file = db.prepare(
      'SELECT id FROM knowledge_package_files WHERE id = ? AND package_id = ? AND user_id = ?'
    ).get(fileId, packageId, userId);

    if (!file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    db.prepare('DELETE FROM knowledge_package_files WHERE id = ?').run(fileId);

    // Atualizar updated_at do pacote
    db.prepare('UPDATE knowledge_packages SET updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), packageId);

    res.json({ message: 'Arquivo removido com sucesso' });
  } catch (error) {
    console.error('[KnowledgePackages] DeleteFile error:', error);
    res.status(500).json({ error: 'Erro ao remover arquivo do pacote' });
  }
});

export default router;
