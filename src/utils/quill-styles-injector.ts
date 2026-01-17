/**
 * @file quill-styles-injector.ts
 * @description Injeção dinâmica de estilos CSS para o editor Quill
 * @version v1.37.20
 *
 * Extraído do App.tsx para modularização.
 * Contém estilos para temas escuro e claro do editor Quill.
 */

/**
 * Injeta estilos CSS para o tema escuro do Quill editor
 * Remove estilos existentes antes de injetar para garantir atualização
 */
export function injectQuillStyles(): void {
  const styleId = 'quill-dark-theme-styles';

  // SEMPRE remover estilos antigos (se existirem) para garantir atualização
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Quill Dark Theme - SentencifyAI (Injetado Globalmente) */
    .ql-toolbar.ql-snow {
      border: none !important;
      border-bottom: 1px solid rgb(71, 85, 105) !important;
      background: rgba(51, 65, 85, 0.95) !important;
      padding: 8px !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 10 !important;
      /* v1.9.31: backdrop-filter removido - causa lag */
    }

    /* Ícones da toolbar - Tamanho e cores */
    .ql-toolbar.ql-snow button {
      width: 28px !important;
      height: 24px !important;
      padding: 3px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .ql-toolbar.ql-snow button svg {
      width: 18px !important;
      height: 18px !important;
    }

    .ql-toolbar.ql-snow .ql-stroke {
      stroke: rgb(203, 213, 225) !important;
      stroke-width: 2 !important;
    }

    .ql-toolbar.ql-snow .ql-fill {
      fill: rgb(203, 213, 225) !important;
    }

    .ql-toolbar.ql-snow .ql-picker {
      color: rgb(203, 213, 225) !important;
    }

    .ql-toolbar.ql-snow .ql-picker-label {
      color: rgb(203, 213, 225) !important;
      border-color: rgb(100, 116, 139) !important;
    }

    .ql-toolbar.ql-snow button:hover,
    .ql-toolbar.ql-snow button.ql-active {
      background: rgb(71, 85, 105) !important;
    }

    .ql-toolbar.ql-snow .ql-picker-options {
      background: rgb(51, 65, 85) !important;
      border-color: rgb(100, 116, 139) !important;
    }

    .ql-toolbar.ql-snow .ql-picker-item:hover {
      background: rgb(71, 85, 105) !important;
      color: rgb(241, 245, 249) !important;
    }

    .ql-container.ql-snow {
      border: none !important;
      background: rgb(30, 41, 59) !important;
    }

    .ql-editor {
      background-color: rgb(30, 41, 59) !important;
      color: inherit !important;
      min-height: 300px !important;
      max-height: 60vh !important;
      overflow: auto !important;
      padding: 16px !important;
      font-size: 14px !important;
      line-height: 1.35 !important;  /* v1.5.11: Reduzido de 1.6 para fix espaçamento duplo entre parágrafos */
      resize: vertical !important;
      display: block !important;
    }

    .ql-editor p {
      margin-bottom: 0.25em !important;  /* v1.5.11: Espaçamento sutil para aparência de quebra única */
    }

    /* Negrito - apenas peso (herda cor do tema) */
    .ql-editor strong,
    .ql-editor b {
      font-weight: 700 !important;
    }

    .ql-editor.ql-blank::before {
      color: var(--text-muted) !important;
      font-style: italic !important;
    }

    /* v1.36.8: Quill usa ::before para todos os marcadores de lista
       NÃO usar list-style-type - causa duplicação */
    .ql-editor ul,
    .ql-editor ol {
      list-style-type: none !important;
      padding-left: 2rem !important;
      margin: 1rem 0 !important;
    }

    /* v1.36.9: Override ::before para bullets em <ol>
       Quill CDN não tem regra para data-list="bullet" em <ol> */
    .ql-editor ol li[data-list="bullet"]::before {
      content: '\\2022' !important;
      margin-right: 0.3em;
    }

    /* Indentação de parágrafos - usando margin-left para melhor compatibilidade */
    .ql-editor .ql-indent-1 {
      margin-left: 3em !important;
      padding-left: 0 !important;
    }

    .ql-editor .ql-indent-2 {
      margin-left: 6em !important;
      padding-left: 0 !important;
    }

    .ql-editor .ql-indent-3 {
      margin-left: 9em !important;
      padding-left: 0 !important;
    }

    .ql-editor .ql-indent-4 {
      margin-left: 12em !important;
      padding-left: 0 !important;
    }

    .ql-editor .ql-indent-5 {
      margin-left: 15em !important;
      padding-left: 0 !important;
    }

    .ql-editor .ql-indent-6 {
      margin-left: 18em !important;
      padding-left: 0 !important;
    }

    .ql-editor .ql-indent-7 {
      margin-left: 21em !important;
      padding-left: 0 !important;
    }

    .ql-editor .ql-indent-8 {
      margin-left: 24em !important;
      padding-left: 0 !important;
    }

    /* Espaçamento de Parágrafos - Compacto */
    .spacing-compact .ql-editor,
    .spacing-compact[contenteditable] {
      line-height: 1.2 !important;
    }
    .spacing-compact .ql-editor p,
    .spacing-compact[contenteditable] p {
      margin-bottom: 0.15em !important;
    }

    /* Normal: line-height 1.35, margin 0.25em (padrão atual) */
    .spacing-normal .ql-editor,
    .spacing-normal[contenteditable] {
      line-height: 1.35 !important;
    }
    .spacing-normal .ql-editor p,
    .spacing-normal[contenteditable] p {
      margin-bottom: 0.25em !important;
    }

    /* Confortável: line-height 1.6, margin 0.5em */
    .spacing-comfortable .ql-editor,
    .spacing-comfortable[contenteditable] {
      line-height: 1.6 !important;
    }
    .spacing-comfortable .ql-editor p,
    .spacing-comfortable[contenteditable] p {
      margin-bottom: 0.5em !important;
    }

    /* Amplo: line-height 2.0, margin 1.0em */
    .spacing-wide .ql-editor,
    .spacing-wide[contenteditable] {
      line-height: 2.0 !important;
    }
    .spacing-wide .ql-editor p,
    .spacing-wide[contenteditable] p {
      margin-bottom: 1.0em !important;
    }

    /* Tamanho de Fonte - Normal */
    .fontsize-normal .ql-editor,
    .fontsize-normal[contenteditable] {
      font-size: 14px !important;
    }

    /* Maior: 16px */
    .fontsize-larger .ql-editor,
    .fontsize-larger[contenteditable] {
      font-size: 16px !important;
    }

    /* Grande: 18px */
    .fontsize-largest .ql-editor,
    .fontsize-largest[contenteditable] {
      font-size: 18px !important;
    }

    /* Hover effect para SpacingDropdown (CSS hover, não Tailwind) */
    .hover-border-blue-500:hover:not(:disabled) {
      border-color: #3b82f6 !important;
    }

    .ql-editor h1 {
      font-size: 2rem !important;
      font-weight: bold !important;
      margin: 1rem 0 !important;
    }

    .ql-editor h2 {
      font-size: 1.5rem !important;
      font-weight: bold !important;
      margin: 0.75rem 0 !important;
    }

    .ql-editor h3 {
      font-size: 1.25rem !important;
      font-weight: bold !important;
      margin: 0.5rem 0 !important;
    }

    .ql-editor a {
      color: var(--accent-blue) !important;
      text-decoration: underline !important;
    }

    .ql-editor blockquote {
      border-left: 4px solid var(--border-primary) !important;
      padding-left: 1rem !important;
      margin: 1rem 0 !important;
      font-style: italic !important;
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       COLOR-FREE FALLBACK (v1.37.81)
       Força herança de cor do tema mesmo se cores inline escaparem da sanitização
       ═══════════════════════════════════════════════════════════════════════════ */
    .ql-editor,
    .ql-editor p,
    .ql-editor span,
    .ql-editor div,
    .ql-editor li,
    .ql-editor strong,
    .ql-editor em,
    .ql-editor u {
      color: inherit !important;
      background-color: transparent !important;
    }

    /* Links: cor de destaque do tema */
    .ql-editor a {
      color: var(--accent-blue) !important;
    }

    /* Blockquote: cor secundária */
    .ql-editor blockquote {
      color: var(--text-muted) !important;
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       TEMA CLARO (v1.37.82)
       Estilos aplicados via classe .quill-light-theme nos componentes
       ═══════════════════════════════════════════════════════════════════════════ */

    /* Container e editor - fundo bege claro */
    .quill-light-theme .ql-container.ql-snow {
      background-color: #fefcf3 !important;
      border: none !important;
    }

    .quill-light-theme .ql-editor {
      background-color: #fefcf3 !important;
      color: #292524 !important;
    }

    /* Elementos de texto - cor escura */
    .quill-light-theme .ql-editor p,
    .quill-light-theme .ql-editor span,
    .quill-light-theme .ql-editor li,
    .quill-light-theme .ql-editor div {
      color: #292524 !important;
    }

    /* Títulos */
    .quill-light-theme .ql-editor h1,
    .quill-light-theme .ql-editor h2,
    .quill-light-theme .ql-editor h3 {
      color: #1c1917 !important;
    }

    /* Negrito */
    .quill-light-theme .ql-editor strong,
    .quill-light-theme .ql-editor b {
      color: #000000 !important;
      font-weight: 700 !important;
    }

    /* Links */
    .quill-light-theme .ql-editor a {
      color: #2563eb !important;
    }

    /* Blockquotes */
    .quill-light-theme .ql-editor blockquote {
      border-left: 4px solid #d6d3d1 !important;
      color: #57534e !important;
    }

    /* Placeholder */
    .quill-light-theme .ql-editor.ql-blank::before {
      color: #a8a29e !important;
    }

    /* Toolbar - fundo cinza claro */
    .quill-light-theme .ql-toolbar.ql-snow {
      background: #f5f5f4 !important;
      border-bottom: 1px solid #d6d3d1 !important;
    }

    /* Ícones da toolbar - cor escura */
    .quill-light-theme .ql-toolbar.ql-snow .ql-stroke {
      stroke: #57534e !important;
    }

    .quill-light-theme .ql-toolbar.ql-snow .ql-fill {
      fill: #57534e !important;
    }

    /* Pickers/dropdowns */
    .quill-light-theme .ql-toolbar.ql-snow .ql-picker {
      color: #44403c !important;
    }

    .quill-light-theme .ql-toolbar.ql-snow .ql-picker-label {
      color: #44403c !important;
    }

    .quill-light-theme .ql-toolbar.ql-snow .ql-picker-options {
      background: #ffffff !important;
      border: 1px solid #d6d3d1 !important;
    }

    .quill-light-theme .ql-toolbar.ql-snow .ql-picker-item {
      color: #292524 !important;
    }

    .quill-light-theme .ql-toolbar.ql-snow .ql-picker-item:hover {
      background: #e7e5e4 !important;
    }

    /* Botões hover */
    .quill-light-theme .ql-toolbar.ql-snow button:hover {
      background: #e7e5e4 !important;
    }

    .quill-light-theme .ql-toolbar.ql-snow button:hover .ql-stroke {
      stroke: #000000 !important;
    }
  `;

  document.head.appendChild(style);
}
