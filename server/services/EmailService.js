// server/services/EmailService.js - Integração com Resend
// v1.0.1 - Usar email de teste do Resend (não requer verificação de domínio)

import { Resend } from 'resend';

class EmailService {
  constructor() {
    this.resend = null;
    // Resend permite enviar de onboarding@resend.dev sem verificação de domínio
    this.fromEmail = 'SentencifyAI <onboarding@resend.dev>';
  }

  init() {
    if (!this.resend && process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      console.log('[EmailService] Resend initialized');
    }
    return this;
  }

  async sendMagicLink(email, magicLink) {
    if (!this.resend) {
      console.warn('[EmailService] Resend not configured - magic link:', magicLink);
      // Em desenvolvimento, apenas loga o link
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📧 Magic Link para ${email}:\n${magicLink}\n`);
        return { success: true, dev: true };
      }
      throw new Error('Serviço de email não configurado');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Seu link de acesso ao SentencifyAI',
        html: this.getMagicLinkTemplate(magicLink),
      });

      if (error) {
        console.error('[EmailService] Resend error:', error);
        throw new Error(error.message || 'Erro ao enviar email');
      }

      console.log(`[EmailService] Magic link sent to ${email} (id: ${data?.id})`);
      return { success: true, id: data?.id };
    } catch (error) {
      console.error('[EmailService] Send error:', error);
      throw error;
    }
  }

  // v1.35.1: Enviar convite de compartilhamento de biblioteca
  async sendShareInvite(ownerEmail, recipientEmail, shareLink, permission) {
    if (!this.resend) {
      console.warn('[EmailService] Resend not configured - share invite:', shareLink);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📧 Convite de Compartilhamento para ${recipientEmail}:\n${shareLink}\n`);
        return { success: true, dev: true };
      }
      throw new Error('Serviço de email não configurado');
    }

    try {
      const permissionText = permission === 'edit' ? 'leitura e escrita' : 'somente leitura';
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipientEmail,
        subject: `${ownerEmail} quer compartilhar modelos com você`,
        html: this.getShareInviteTemplate(ownerEmail, shareLink, permissionText),
      });

      if (error) {
        console.error('[EmailService] Resend error:', error);
        throw new Error(error.message || 'Erro ao enviar email');
      }

      console.log(`[EmailService] Share invite sent to ${recipientEmail} (id: ${data?.id})`);
      return { success: true, id: data?.id };
    } catch (error) {
      console.error('[EmailService] Send error:', error);
      throw error;
    }
  }

  getShareInviteTemplate(ownerEmail, shareLink, permissionText) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite de Compartilhamento - SentencifyAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1e293b;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; border: 1px solid #334155;">
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; width: 64px; height: 64px; background: rgba(147, 51, 234, 0.2); border-radius: 50%; line-height: 64px; font-size: 28px;">
                  🔗
                </div>
              </div>

              <!-- Title -->
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #f8fafc; text-align: center;">
                Convite de Compartilhamento
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8; text-align: center;">
                <span style="color: #a78bfa; font-weight: 600;">${ownerEmail}</span> quer compartilhar sua biblioteca de modelos com você.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 14px; color: #64748b; text-align: center;">
                Permissão: <span style="color: #f8fafc; font-weight: 500;">${permissionText}</span>
              </p>

              <!-- Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${shareLink}" style="display: inline-block; padding: 14px 32px; background: #9333ea; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                  Aceitar Compartilhamento
                </a>
              </div>

              <!-- Alternative -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; text-align: center;">
                Ou copie e cole este link no navegador:
              </p>
              <p style="margin: 0; font-size: 12px; color: #a78bfa; word-break: break-all; text-align: center; background: rgba(51, 65, 85, 0.5); padding: 12px; border-radius: 8px;">
                ${shareLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="border-top: 1px solid #334155; padding-top: 24px;">
                <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                  Se você não conhece ${ownerEmail}, ignore este email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  getMagicLinkTemplate(magicLink) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso SentencifyAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1e293b;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin: 0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; border: 1px solid #334155;">
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; width: 64px; height: 64px; background: rgba(59, 130, 246, 0.2); border-radius: 50%; line-height: 64px; font-size: 28px;">
                  ⚖️
                </div>
              </div>

              <!-- Title -->
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #f8fafc; text-align: center;">
                Acesso ao SentencifyAI
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #94a3b8; text-align: center;">
                Clique no botão abaixo para acessar sua conta. Este link é válido por 15 minutos.
              </p>

              <!-- Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${magicLink}" style="display: inline-block; padding: 14px 32px; background: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                  Acessar SentencifyAI
                </a>
              </div>

              <!-- Alternative -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; text-align: center;">
                Ou copie e cole este link no navegador:
              </p>
              <p style="margin: 0; font-size: 12px; color: #3b82f6; word-break: break-all; text-align: center; background: rgba(51, 65, 85, 0.5); padding: 12px; border-radius: 8px;">
                ${magicLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="border-top: 1px solid #334155; padding-top: 24px;">
                <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                  Se você não solicitou este acesso, ignore este email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

export default new EmailService();
