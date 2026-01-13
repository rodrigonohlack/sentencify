/**
 * @file useDecisionExport.ts
 * @description Hook para exportação da decisão
 * @version v1.37.26
 *
 * Extraído do App.tsx para modularização.
 * Gerencia exportação da sentença para clipboard e modal.
 */

import React from 'react';
import { EXPORT_STYLES } from '../constants/export-styles';
import { cleanHtmlForExport, htmlToFormattedText } from '../utils/html-conversion';
import type { Topic } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface UseDecisionExportProps {
  selectedTopics: Topic[];
  setError: (error: string) => void;
  openModal: (modalId: string) => void;
  setExportedText: (text: string) => void;
  setExportedHtml: (html: string) => void;
  setCopySuccess: (success: boolean) => void;
  copyTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export interface UseDecisionExportReturn {
  exportDecision: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDecisionExport({
  selectedTopics,
  setError,
  openModal,
  setExportedText,
  setExportedHtml,
  setCopySuccess,
  copyTimeoutRef
}: UseDecisionExportProps): UseDecisionExportReturn {

  const exportDecision = React.useCallback(async () => {
    if (selectedTopics.length === 0) {
      setError('Nenhum tópico selecionado para exportar');
      return;
    }

    setError('');

    try {
      let plainText = 'SENTENÇA\n\n';

      // HTML otimizado para Google Docs e Word
      let htmlText = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    margin: 2.54cm;
  }
  h1 {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 20px;
    text-transform: uppercase;
  }
  h2 {
    font-size: 12pt;
    font-weight: bold;
    margin-top: 20px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  p {
    margin: 0 0 12px 0;
    text-align: justify;
    text-indent: 0;
  }
  ul, ol {
    margin: 10px 0;
    padding-left: 40px;
  }
  li {
    margin-bottom: 6px;
  }
  b, strong {
    font-weight: bold;
  }
  i, em {
    font-style: italic;
  }
  u {
    text-decoration: underline;
  }
  .section {
    margin-bottom: 30px;
  }
  .fundamentacao-header {
    text-align: left;
    font-weight: bold;
    font-size: 12pt;
    margin: 30px 0 20px 0;
    text-transform: uppercase;
  }
</style>
</head>
<body>
<h1 style="${EXPORT_STYLES.h1}">SENTENÇA</h1>
`;

      selectedTopics.forEach((topic, index) => {
        // Remover numeração romana do título
        let topicTitle = topic.title.toUpperCase();
        topicTitle = topicTitle.replace(/^I\s*[-–]\s*/i, '');
        topicTitle = topicTitle.replace(/^II\s*[-–]\s*/i, '');
        topicTitle = topicTitle.replace(/^III\s*[-–]\s*/i, '');
        topicTitle = topicTitle.replace(/^IV\s*[-–]\s*/i, '');
        topicTitle = topicTitle.replace(/^V\s*[-–]\s*/i, '');

        plainText += `\n${topicTitle}\n\n`;

        htmlText += `<div style="${EXPORT_STYLES.section}">`;
        htmlText += `<h2 style="${EXPORT_STYLES.h2}">${topicTitle}</h2>`;

        const isRelatorio = topic.title.toUpperCase() === 'RELATÓRIO';
        const isDispositivo = topic.title.toUpperCase() === 'DISPOSITIVO';

        if (isRelatorio) {
          // RELATÓRIO: apenas editedRelatorio
          const relatorioHtml = topic.editedRelatorio || topic.relatorio || '';
          if (relatorioHtml) {
            htmlText += cleanHtmlForExport(relatorioHtml);
            plainText += htmlToFormattedText(relatorioHtml) + '\n\n';
          }
        } else if (isDispositivo) {
          // DISPOSITIVO: apenas editedContent
          if (topic.editedContent) {
            htmlText += cleanHtmlForExport(topic.editedContent);
            plainText += htmlToFormattedText(topic.editedContent) + '\n\n';
          }
        } else {
          // Tópicos normais: mini-relatório + fundamentação
          const relatorioHtml = topic.editedRelatorio || topic.relatorio || '';
          if (relatorioHtml) {
            htmlText += cleanHtmlForExport(relatorioHtml);
            plainText += htmlToFormattedText(relatorioHtml) + '\n\n';
          }
          if (topic.editedFundamentacao) {
            htmlText += cleanHtmlForExport(topic.editedFundamentacao);
            plainText += htmlToFormattedText(topic.editedFundamentacao) + '\n\n';
          }
        }

        htmlText += `</div>`;

        // Adicionar "FUNDAMENTAÇÃO" após o primeiro tópico (RELATÓRIO)
        if (index === 0) {
          plainText += '\nFUNDAMENTAÇÃO\n\n';
          htmlText += `<div style="${EXPORT_STYLES.fundamentacaoHeader}">FUNDAMENTAÇÃO</div>`;
        }
      });

      htmlText += `
</body>
</html>`;

      setExportedText(plainText);
      setExportedHtml(htmlText);
      openModal('export');

      try {
        // Tentar copiar com formatação rica
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });

        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
          })
        ]);

        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopySuccess(true);
        copyTimeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
      } catch (clipErr) {
        // Fallback: formato rico falhou, tentar texto simples
        try {
          await navigator.clipboard.writeText(plainText);
          if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
          setCopySuccess(true);
          copyTimeoutRef.current = setTimeout(() => setCopySuccess(false), 3000);
        } catch (err2) {
          setError('Não foi possível copiar automaticamente. Use o botão "Copiar Novamente" no modal.');
        }
      }
    } catch (err) {
      setError('Erro ao exportar decisão: ' + (err as Error).message);
    }
  }, [selectedTopics, setError, openModal, setExportedText, setExportedHtml, setCopySuccess, copyTimeoutRef]);

  return {
    exportDecision
  };
}
