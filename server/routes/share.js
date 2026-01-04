// server/routes/share.js - Compartilhamento de Biblioteca de Modelos
// v1.35.1 - Convite por email direto (não mais link público)

import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';
import authMiddleware from '../middleware/auth.js';
import emailService from '../services/EmailService.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// POST /api/share/library
// v1.35.1: Enviar convite de compartilhamento por email
// ═══════════════════════════════════════════════════════════════
router.post('/library', authMiddleware, async (req, res) => {
  try {
    const { permission = 'view', recipientEmail } = req.body;
    const userId = req.user.id;
    const ownerEmail = req.user.email;
    const db = getDb();

    // Validar permission
    if (!['view', 'edit'].includes(permission)) {
      return res.status(400).json({ error: 'Permissão inválida. Use "view" ou "edit".' });
    }

    // v1.35.1: Validar email do destinatário
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'Email do destinatário é obrigatório.' });
    }

    // Não pode compartilhar consigo mesmo
    if (recipientEmail.toLowerCase() === ownerEmail.toLowerCase()) {
      return res.status(400).json({ error: 'Você não pode compartilhar sua biblioteca consigo mesmo.' });
    }

    // Verificar se já existe um share ativo para este destinatário
    const existing = db.prepare(`
      SELECT * FROM library_shares
      WHERE owner_id = ? AND recipient_email = ? AND revoked_at IS NULL
    `).get(userId, recipientEmail.toLowerCase());

    if (existing) {
      return res.status(400).json({
        error: 'Você já enviou um convite para este email.',
        existingShare: {
          id: existing.id,
          permission: existing.permission,
          createdAt: existing.created_at
        }
      });
    }

    // Gerar novo token e criar share
    const shareToken = crypto.randomBytes(16).toString('hex');
    const shareId = uuidv4();
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareToken}`;

    db.prepare(`
      INSERT INTO library_shares (id, owner_id, share_token, permission, recipient_email)
      VALUES (?, ?, ?, ?, ?)
    `).run(shareId, userId, shareToken, permission, recipientEmail.toLowerCase());

    // Enviar email de convite
    try {
      emailService.init();
      await emailService.sendShareInvite(ownerEmail, recipientEmail, shareUrl, permission);
      console.log(`[Share] Convite enviado: ${ownerEmail} -> ${recipientEmail} (${permission})`);
    } catch (emailError) {
      // Se falhar o envio de email, remover o share criado
      db.prepare(`DELETE FROM library_shares WHERE id = ?`).run(shareId);
      console.error('[Share] Email error:', emailError);
      return res.status(500).json({ error: 'Erro ao enviar email de convite. Tente novamente.' });
    }

    res.json({
      success: true,
      shareId,
      recipientEmail,
      permission,
      message: `Convite enviado para ${recipientEmail}`
    });
  } catch (error) {
    console.error('[Share] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar compartilhamento' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/share/library/my-shares
// Listar compartilhamentos criados (proprietário)
// IMPORTANTE: Deve vir ANTES de /library/:token para não ser capturado como token
// ═══════════════════════════════════════════════════════════════
router.get('/library/my-shares', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    const shares = db.prepare(`
      SELECT * FROM library_shares
      WHERE owner_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
    `).all(userId);

    // Para cada share, buscar os destinatários
    const sharesWithRecipients = shares.map(share => {
      const recipients = db.prepare(`
        SELECT la.*, u.email as recipient_email
        FROM library_access la
        JOIN users u ON la.recipient_id = u.id
        WHERE la.share_id = ?
      `).all(share.id);

      return {
        id: share.id,
        shareToken: share.share_token,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.share_token}`,
        permission: share.permission,
        recipient_email: share.recipient_email,
        created_at: share.created_at,
        recipients: recipients.map(r => ({
          id: r.id,
          email: r.recipient_email,
          acceptedAt: r.accepted_at
        }))
      };
    });

    res.json({ shares: sharesWithRecipients });
  } catch (error) {
    console.error('[Share] My shares error:', error);
    res.status(500).json({ error: 'Erro ao listar compartilhamentos' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/share/library/shared-with-me
// Listar bibliotecas que tenho acesso
// IMPORTANTE: Deve vir ANTES de /library/:token para não ser capturado como token
// ═══════════════════════════════════════════════════════════════
router.get('/library/shared-with-me', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    const libraries = db.prepare(`
      SELECT la.*, u.email as owner_email,
        (SELECT COUNT(*) FROM models WHERE user_id = la.owner_id AND deleted_at IS NULL) as models_count
      FROM library_access la
      JOIN users u ON la.owner_id = u.id
      WHERE la.recipient_id = ?
      ORDER BY la.accepted_at DESC
    `).all(userId);

    res.json({
      libraries: libraries.map(lib => ({
        accessId: lib.id,
        ownerId: lib.owner_id,
        ownerEmail: lib.owner_email,
        permission: lib.permission,
        modelsCount: lib.models_count,
        acceptedAt: lib.accepted_at
      }))
    });
  } catch (error) {
    console.error('[Share] Shared with me error:', error);
    res.status(500).json({ error: 'Erro ao listar bibliotecas compartilhadas' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/share/library/:token
// Validar token e obter info do compartilhamento (público)
// ═══════════════════════════════════════════════════════════════
router.get('/library/:token', (req, res) => {
  try {
    const { token } = req.params;
    const db = getDb();

    const share = db.prepare(`
      SELECT ls.*, u.email as owner_email
      FROM library_shares ls
      JOIN users u ON ls.owner_id = u.id
      WHERE ls.share_token = ? AND ls.revoked_at IS NULL
    `).get(token);

    if (!share) {
      return res.status(404).json({ error: 'Link de compartilhamento inválido ou expirado' });
    }

    // Contar modelos do proprietário
    const modelsCount = db.prepare(`
      SELECT COUNT(*) as count FROM models
      WHERE user_id = ? AND deleted_at IS NULL
    `).get(share.owner_id).count;

    res.json({
      owner: {
        id: share.owner_id,
        email: share.owner_email
      },
      permission: share.permission,
      modelsCount,
      createdAt: share.created_at
    });
  } catch (error) {
    console.error('[Share] Get info error:', error);
    res.status(500).json({ error: 'Erro ao obter informações do compartilhamento' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/share/library/:token/accept
// Aceitar compartilhamento (criar acesso)
// ═══════════════════════════════════════════════════════════════
router.post('/library/:token/accept', authMiddleware, (req, res) => {
  try {
    const { token } = req.params;
    const recipientId = req.user.id;
    const db = getDb();

    // Buscar share
    const share = db.prepare(`
      SELECT ls.*, u.email as owner_email
      FROM library_shares ls
      JOIN users u ON ls.owner_id = u.id
      WHERE ls.share_token = ? AND ls.revoked_at IS NULL
    `).get(token);

    if (!share) {
      return res.status(404).json({ error: 'Link de compartilhamento inválido ou expirado' });
    }

    // Não pode aceitar próprio compartilhamento
    if (share.owner_id === recipientId) {
      return res.status(400).json({ error: 'Você não pode aceitar seu próprio compartilhamento' });
    }

    // Verificar se já tem acesso
    const existingAccess = db.prepare(`
      SELECT * FROM library_access WHERE owner_id = ? AND recipient_id = ?
    `).get(share.owner_id, recipientId);

    if (existingAccess) {
      return res.json({
        success: true,
        ownerId: share.owner_id,
        ownerEmail: share.owner_email,
        permission: existingAccess.permission,
        alreadyAccepted: true
      });
    }

    // Criar acesso
    const accessId = uuidv4();
    db.prepare(`
      INSERT INTO library_access (id, share_id, owner_id, recipient_id, permission)
      VALUES (?, ?, ?, ?, ?)
    `).run(accessId, share.id, share.owner_id, recipientId, share.permission);

    console.log(`[Share] Acesso aceito: ${req.user.email} -> ${share.owner_email} (${share.permission})`);

    res.json({
      success: true,
      ownerId: share.owner_id,
      ownerEmail: share.owner_email,
      permission: share.permission,
      alreadyAccepted: false
    });
  } catch (error) {
    console.error('[Share] Accept error:', error);
    res.status(500).json({ error: 'Erro ao aceitar compartilhamento' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/share/library/:shareId
// Revogar compartilhamento (proprietário)
// ═══════════════════════════════════════════════════════════════
router.delete('/library/:shareId', authMiddleware, (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;
    const db = getDb();

    // Verificar se o share pertence ao usuário
    const share = db.prepare(`
      SELECT * FROM library_shares WHERE id = ? AND owner_id = ?
    `).get(shareId, userId);

    if (!share) {
      return res.status(404).json({ error: 'Compartilhamento não encontrado' });
    }

    // Revogar (soft delete)
    db.prepare(`
      UPDATE library_shares SET revoked_at = datetime('now') WHERE id = ?
    `).run(shareId);

    // Remover todos os acessos vinculados
    db.prepare(`
      DELETE FROM library_access WHERE share_id = ?
    `).run(shareId);

    console.log(`[Share] Compartilhamento revogado: ${req.user.email}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Share] Revoke error:', error);
    res.status(500).json({ error: 'Erro ao revogar compartilhamento' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/share/library/access/:accessId
// Remover acesso recebido (destinatário)
// ═══════════════════════════════════════════════════════════════
router.delete('/library/access/:accessId', authMiddleware, (req, res) => {
  try {
    const { accessId } = req.params;
    const userId = req.user.id;
    const db = getDb();

    // Verificar se o acesso pertence ao usuário (como destinatário)
    const access = db.prepare(`
      SELECT * FROM library_access WHERE id = ? AND recipient_id = ?
    `).get(accessId, userId);

    if (!access) {
      return res.status(404).json({ error: 'Acesso não encontrado' });
    }

    db.prepare(`DELETE FROM library_access WHERE id = ?`).run(accessId);

    console.log(`[Share] Acesso removido pelo destinatário: ${req.user.email}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Share] Remove access error:', error);
    res.status(500).json({ error: 'Erro ao remover acesso' });
  }
});

export default router;
