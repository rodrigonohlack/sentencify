/**
 * @file GlobalHoverStyles.tsx
 * @description CSS global hover effects component - Theme-aware hover classes and animations
 * @version 1.37.0
 */

/**
 * GlobalHoverStyles Component
 * Renders global CSS hover effects as a <style> tag
 * Includes theme-aware hover classes, animations, and component-specific styles
 */
const GlobalHoverStyles = () => (
  <style>{`
    /* SPINNER ANIMATION */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-spin { animation: spin 1s linear infinite; }

    /* TOGGLE SWITCH */
    .toggle-switch {
      position: relative;
      width: 36px;
      height: 20px;
      background-color: #4b5563;
      border-radius: 9999px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .toggle-switch.active {
      background-color: #2563eb;
    }
    .toggle-switch .toggle-knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background-color: white;
      border-radius: 9999px;
      transition: transform 0.2s;
    }
    .toggle-switch.active .toggle-knob {
      transform: translateX(16px);
    }

    /* HOVER CLASSES - Theme-aware */
    .hover-slate-600:hover:not(:disabled) { background-color: var(--hover-slate-600) !important; }

    /* Accent colors (cores fixas) */
    .hover-blue-700:hover:not(:disabled) { background-color: #1d4ed8 !important; }
    .hover-blue-500:hover:not(:disabled) { background-color: #3b82f6 !important; }
    .hover-purple-700:hover:not(:disabled) { background-color: #7e22ce !important; }
    .hover-green-700:hover:not(:disabled) { background-color: #15803d !important; }
    .hover-red-700:hover:not(:disabled) { background-color: #b91c1c !important; }
    .hover-amber-700:hover:not(:disabled) { background-color: #b45309 !important; }
    .hover-yellow-600:hover:not(:disabled) { background-color: #ca8a04 !important; }
    /* Slate hovers - theme-aware */
    .hover-slate-700:hover:not(:disabled) { background-color: var(--hover-slate-700) !important; }
    .hover-slate-800:hover:not(:disabled) { background-color: var(--hover-slate-800) !important; }
    .hover-orange-700:hover:not(:disabled) { background-color: #c2410c !important; }
    .hover-slate-500:hover:not(:disabled) { background-color: var(--hover-slate-500) !important; }

    /* BACKGROUND HOVERS */
    .hover-red-alpha-20:hover:not(:disabled) { background-color: rgba(239, 68, 68, 0.2) !important; }
    .hover-green-900-alpha-40:hover:not(:disabled) { background-color: rgba(20, 83, 45, 0.4) !important; }

    /* TEXT COLOR HOVERS */
    .hover-text-red-300:hover:not(:disabled) { color: #fca5a5 !important; }
    .hover-text-red-400:hover:not(:disabled) { color: #f87171 !important; }
    .error-close-btn:hover { color: #fca5a5 !important; background-color: rgba(239, 68, 68, 0.2) !important; }
    .hover-theme-text-secondary:hover:not(:disabled) { color: #e2e8f0 !important; }
    .hover-theme-text-tertiary:hover:not(:disabled) { color: #cbd5e1 !important; }
    .hover-text-green-300:hover:not(:disabled) { color: #86efac !important; }
    .hover-text-white:hover:not(:disabled) { color: #ffffff !important; }

    /* v1.20.0: Quick Prompt Buttons */
    .hover-quick-prompt:hover:not(:disabled) {
      background-color: #dbeafe !important;
      border-color: #60a5fa !important;
    }
    .dark .hover-quick-prompt:hover:not(:disabled) {
      background-color: rgba(59, 130, 246, 0.2) !important;
      border-color: #3b82f6 !important;
    }

    /* BACKGROUND HOVERS - Theme-aware */
    .hover-theme-bg-secondary:hover:not(:disabled) { background-color: var(--bg-secondary) !important; }
    .hover-theme-bg-tertiary:hover:not(:disabled) { background-color: var(--bg-tertiary) !important; }

    /* Tab inactive hover - alto contraste */
    .hover-tab-inactive {
      background-color: var(--bg-secondary);
      transition: background-color 0.2s ease;
    }
    .hover-tab-inactive:hover:not(:disabled) {
      background-color: var(--bg-tertiary) !important;
    }

    /* BORDER HOVERS */
    .hover-theme-border:hover { border-color: var(--hover-slate-500) !important; }
    .hover-border-blue-500:hover { border-color: #3b82f6 !important; }
    .hover-border-purple-alpha-30:hover { border-color: rgba(168, 85, 247, 0.3) !important; }

    /* Input com hover - theme-aware */
    .hover-input-slate:hover {
      background-color: var(--bg-hover) !important;
    }

    /* Transform scale hover */
    .hover-scale:hover {
      transform: scale(1.05) !important;
    }

    /* Hover com bases nao-transparentes */
    .hover-green-700-from-600:hover {
      background-color: #047857 !important;
    }
    .hover-green-600-from-700:hover {
      background-color: #16a34a !important;
    }
    .hover-blue-600-from-700:hover {
      background-color: #2563eb !important;
    }
    .hover-red-600-from-700:hover {
      background-color: #dc2626 !important;
    }
    .hover-amber-700-from-600:hover {
      background-color: #b45309 !important;
    }
    .hover-purple-700-from-600:hover {
      background-color: #7e22ce !important;
    }
    .hover-blue-alpha-3-from-2:hover:not(:disabled) {
      background-color: rgba(37, 99, 235, 0.3) !important;
    }
    .hover-purple-alpha-3-from-2:hover {
      background-color: rgba(147, 51, 234, 0.3) !important;
    }
    .hover-blue-700-from-600:hover {
      background-color: #1d4ed8 !important;
    }
    .hover-slate-600-from-700:hover {
      background-color: var(--hover-slate-600) !important;
    }

    /* BACKGROUND COLORS - Cores Solidas Adicionais */
    .hover-pink-700:hover:not(:disabled) { background-color: #be185d !important; }
    .hover-blue-alpha-10:hover:not(:disabled) { background-color: rgba(59, 130, 246, 0.1) !important; }
    .hover-slate-alpha-30:hover:not(:disabled) { background-color: rgba(71, 85, 105, 0.3) !important; }
    .hover-purple-400:hover:not(:disabled) { color: #c084fc !important; }
    .hover-yellow-alpha:hover:not(:disabled) { background-color: rgba(234, 179, 8, 0.15) !important; }
    .hover-green-500:hover:not(:disabled) { background-color: #22c55e !important; }

    /* GRADIENTS - Linear Gradient Hovers */
    .hover-gradient-purple-pink:hover:not(:disabled) {
      background-image: linear-gradient(to right, #7e22ce, #db2777) !important;
    }
    .hover-gradient-purple-blue:hover:not(:disabled) {
      background-image: linear-gradient(to right, #7e22ce, #1d4ed8) !important;
    }
    .hover-gradient-blue-purple:hover:not(:disabled) {
      background-image: linear-gradient(to right, #1d4ed8, #7e22ce) !important;
    }
    .hover-gradient-green:hover:not(:disabled) {
      background-image: linear-gradient(to right, #15803d, #047857) !important;
    }

    /* BORDERS - Additional Border Colors */
    .hover-border-purple-500:hover { border-color: #a855f7 !important; }
    .hover-border-purple-alpha-50:hover { border-color: rgba(168, 85, 247, 0.5) !important; }

    /* TRANSFORMS - Scale Effects */
    .hover-scale-125:hover:not(:disabled) {
      transform: scale(1.25) !important;
    }

    /* NESTED HOVERS - Parent:hover Child Effect */
    .hover-label-text-blue:hover span {
      color: #bfdbfe !important;
    }

    .hover-button-contextual {
      background-color: rgba(51, 65, 85, 0.5);
      border-color: #475569;
      transition: all 0.3s ease;
    }
    .hover-button-contextual:hover {
      background-color: rgba(147, 51, 234, 0.2) !important;
      border-color: #a855f7 !important;
    }
    .hover-button-contextual:hover .icon-wrapper {
      background-color: rgba(147, 51, 234, 0.3) !important;
    }

    /* v1.10.9: Botao Analise Livre */
    .hover-button-free {
      background-color: rgba(51, 65, 85, 0.5);
      border-color: #475569;
      transition: all 0.3s ease;
    }
    .hover-button-free:hover {
      background-color: rgba(34, 197, 94, 0.2) !important;
      border-color: #22c55e !important;
    }
    .hover-button-free:hover .icon-wrapper {
      background-color: rgba(34, 197, 94, 0.3) !important;
    }

    /* v1.21.16: Tema claro - Botao Analise Contextual */
    .hover-button-contextual-light {
      background-color: rgba(147, 51, 234, 0.08);
      border: 1px solid rgba(147, 51, 234, 0.2);
      transition: all 0.3s ease;
    }
    .hover-button-contextual-light:hover {
      background-color: rgba(147, 51, 234, 0.15) !important;
      border-color: #a855f7 !important;
    }
    .hover-button-contextual-light:hover .icon-wrapper {
      background-color: rgba(147, 51, 234, 0.25) !important;
    }

    /* v1.21.16: Tema claro - Botao Analise Livre */
    .hover-button-free-light {
      background-color: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.2);
      transition: all 0.3s ease;
    }
    .hover-button-free-light:hover {
      background-color: rgba(34, 197, 94, 0.15) !important;
      border-color: #22c55e !important;
    }
    .hover-button-free-light:hover .icon-wrapper {
      background-color: rgba(34, 197, 94, 0.25) !important;
    }

    /* v1.10.9: Label hover para checkbox purple */
    .hover-label-text-purple:hover span {
      color: #a855f7 !important;
    }

    /* v1.10.10: Label hover para checkbox green */
    .hover-label-text-green:hover span {
      color: #22c55e !important;
    }

    .hover-category-select {
      background-color: var(--hover-slate-600);
      transition: background-color 0.3s ease;
    }
    .hover-category-select:hover:not(:disabled) {
      background-color: var(--hover-slate-500) !important;
    }

    .hover-delete-topic {
      color: #f87171;
      transition: all 0.3s ease;
    }
    .hover-delete-topic:hover:not(:disabled) {
      color: #fca5a5 !important;
      background-color: rgba(127, 29, 29, 0.2) !important;
    }

    .hover-delete-proof {
      transition: background-color 0.3s ease;
    }
    .hover-delete-proof:hover:not(:disabled) {
      background-color: rgba(239, 68, 68, 0.2) !important;
    }

    .hover-proof-panel {
      background-color: rgba(20, 83, 45, 0.3);
      transition: background-color 0.3s ease;
    }
    .hover-proof-panel:hover {
      background-color: rgba(20, 83, 45, 0.4) !important;
    }

    .hover-delete-all {
      color: #94a3b8;
      transition: all 0.3s ease;
    }
    .hover-delete-all:hover:not(:disabled) {
      color: #f87171 !important;
      background-color: rgba(127, 29, 29, 0.2) !important;
    }

    /* BACKGROUNDS - From Transparent (theme-aware) */
    .hover-slate-600-from-transparent:hover:not(:disabled) {
      background-color: var(--hover-slate-600) !important;
    }
    .hover-slate-700-from-transparent:hover:not(:disabled) {
      background-color: var(--hover-slate-700) !important;
    }

    /* BORDERS with Background Combo */
    .hover-border-blue-from-slate {
      transition: all 0.3s ease;
    }
    .hover-border-blue-from-slate:hover {
      border-color: #3b82f6 !important;
    }

    /* TEXT COLORS */
    .hover-text-blue-300:hover:not(:disabled) {
      color: #93c5fd !important;
    }
    .hover-text-purple-400:hover:not(:disabled) {
      color: #c084fc !important;
    }

    /* COMPLEX NESTED - Specific Components */
    .hover-pagination-prev:hover:not(:disabled) {
      background-color: var(--hover-slate-600) !important;
    }
    .hover-pagination-next:hover:not(:disabled) {
      background-color: var(--hover-slate-600) !important;
    }

    /* RED DELETE BUTTONS - From red-600 to red-700 */
    .hover-red-700-from-600 {
      background-color: #dc2626;
      transition: background-color 0.3s ease;
    }
    .hover-red-700-from-600:hover:not(:disabled) {
      background-color: #b91c1c !important;
    }

    /* BORDER COLORS - Model Cards (theme-aware) */
    .hover-theme-border-from-600 {
      border-color: var(--hover-slate-600);
      transition: border-color 0.3s ease;
    }
    .hover-theme-border-from-600:hover {
      border-color: var(--hover-slate-500) !important;
    }

    /* TEXT COLORS - Proof Elements */
    .hover-text-blue-400-from-300 {
      color: #60a5fa;
      transition: color 0.3s ease;
    }
    .hover-text-blue-400-from-300:hover:not(:disabled) {
      color: #93c5fd !important;
    }

    .hover-text-red-400-from-300 {
      color: #f87171;
      transition: color 0.3s ease;
    }
    .hover-text-red-400-from-300:hover:not(:disabled) {
      color: #fca5a5 !important;
    }

    .hover-text-purple-400-from-400 {
      color: #c084fc;
      transition: color 0.3s ease;
    }
    .hover-text-purple-400-from-400:hover:not(:disabled) {
      color: #e9d5ff !important;
    }

    .hover-text-white-from-slate {
      color: #94a3b8;
      transition: color 0.3s ease;
    }
    .hover-text-white-from-slate:hover:not(:disabled) {
      color: #ffffff !important;
    }

    /* SLATE BACKGROUNDS (theme-aware) */
    .hover-slate-700-from-600 {
      background-color: var(--hover-slate-600);
      transition: background-color 0.3s ease;
    }
    .hover-slate-700-from-600:hover:not(:disabled) {
      background-color: var(--hover-slate-700) !important;
    }

    /* ALPHA BACKGROUNDS - From Transparent */
    .hover-blue-alpha-10-from-transparent {
      background-color: transparent;
      transition: all 0.2s ease;
    }
    .hover-blue-alpha-10-from-transparent:hover:not(:disabled) {
      background-color: rgba(59, 130, 246, 0.1) !important;
    }

    .hover-slate-alpha-30-from-transparent {
      background-color: transparent;
      transition: background-color 0.3s ease;
    }
    .hover-slate-alpha-30-from-transparent:hover:not(:disabled) {
      background-color: var(--bg-hover) !important;
      opacity: 0.3;
    }

    /* SuggestionCard insert button */
    .hover-suggestion-insert {
      background-color: #2563eb;
      transition: all 0.3s ease;
    }
    .hover-suggestion-insert:hover:not(:disabled) {
      background-color: #3b82f6 !important;
      transform: scale(1.02) !important;
    }

    /* 2. TopicCard drag area - bg rgba with subtle change */
    .hover-topic-drag-area {
      background-color: rgba(37, 99, 235, 0.1);
      transition: background-color 0.2s ease;
    }
    .hover-topic-drag-area:hover {
      background-color: rgba(37, 99, 235, 0.15) !important;
    }

    /* 3. Merge confirm button - green bg + scale */
    .hover-merge-confirm-btn {
      background-color: #059669;
      transition: all 0.3s ease;
    }
    .hover-merge-confirm-btn:hover:not(:disabled) {
      background-color: #10b981 !important;
      transform: scale(1.05) !important;
    }

    /* 4. Merge cancel button - red bg + scale */
    .hover-merge-cancel-btn {
      background-color: #dc2626;
      transition: all 0.3s ease;
    }
    .hover-merge-cancel-btn:hover:not(:disabled) {
      background-color: #ef4444 !important;
      transform: scale(1.05) !important;
    }

    /* 5. Icon hover blue - bg alpha + scale 1.1 */
    .hover-icon-blue-scale {
      background-color: transparent;
      transition: all 0.3s ease;
    }
    .hover-icon-blue-scale:hover:not(:disabled) {
      background-color: rgba(59, 130, 246, 0.3) !important;
      transform: scale(1.1) !important;
    }

    /* 6. Icon hover green - bg alpha + scale 1.1 */
    .hover-icon-green-scale {
      background-color: transparent;
      transition: all 0.3s ease;
    }
    .hover-icon-green-scale:hover:not(:disabled) {
      background-color: rgba(34, 197, 94, 0.3) !important;
      transform: scale(1.1) !important;
    }

    /* 7. Icon hover red - bg alpha + scale 1.1 */
    .hover-icon-red-scale {
      background-color: transparent;
      transition: all 0.3s ease;
    }
    .hover-icon-red-scale:hover:not(:disabled) {
      background-color: rgba(239, 68, 68, 0.3) !important;
      transform: scale(1.1) !important;
    }

    .hover-bg-red-alpha {
      transition: background-color 0.3s ease;
    }
    .hover-bg-red-alpha:hover:not(:disabled) {
      background-color: rgba(239, 68, 68, 0.2) !important;
    }

    /* 8. Bulk upload drop area - border + bg combo */
    .hover-bulk-upload-area {
      border-color: #475569;
      background-color: transparent;
      transition: all 0.3s ease;
    }
    .hover-bulk-upload-area:hover {
      border-color: #a855f7 !important;
      background-color: rgba(51, 65, 85, 0.3) !important;
    }

    /* 9. Warning button (yellow) - bg + scale */
    .hover-warning-yellow-btn {
      background-color: #eab308;
      transition: all 0.3s ease;
    }
    .hover-warning-yellow-btn:hover:not(:disabled) {
      background-color: #facc15 !important;
      transform: scale(1.05) !important;
    }

    /* Animacao pulse */
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }

    /* Classes para hovers simples */
    .hover-slate-600-from-slate-500 {
      background-color: #64748b;
      transition: background-color 0.3s ease;
    }
    .hover-slate-600-from-slate-500:hover:not(:disabled) {
      background-color: #475569 !important;
    }

    .hover-orange-700-from-600 {
      background-color: #ea580c;
      transition: background-color 0.3s ease;
    }
    .hover-orange-700-from-600:hover:not(:disabled) {
      background-color: #c2410c !important;
    }

    /* FASE 4-5: Classes para gradientes com hover mais escuro */
    .hover-gradient-purple-pink-darker {
      background-image: linear-gradient(to right, #9333ea, #ec4899);
      transition: background-image 0.3s ease;
    }
    .hover-gradient-purple-pink-darker:hover:not(:disabled) {
      background-image: linear-gradient(to right, #7e22ce, #db2777) !important;
    }

    .hover-gradient-purple-blue-darker {
      background-image: linear-gradient(to right, #9333ea, #2563eb);
      transition: background-image 0.3s ease;
    }
    .hover-gradient-purple-blue-darker:hover:not(:disabled) {
      background-image: linear-gradient(to right, #7e22ce, #1d4ed8) !important;
    }

    /* FASE 6: Classes para botoes condicionais */
    .hover-extract-model {
      background-color: #db2777;
      transition: background-color 0.3s ease;
    }
    .hover-extract-model:hover:not(:disabled) {
      background-color: #be185d !important;
    }
    .hover-extract-model.disabled {
      background-color: #9ca3af !important;
      cursor: not-allowed;
    }

    .hover-regenerate-btn {
      background-color: #9333ea;
      transition: background-color 0.3s ease;
    }
    .hover-regenerate-btn:hover:not(:disabled) {
      background-color: #7e22ce !important;
    }
    .hover-regenerate-btn.disabled {
      background-color: #6b7280 !important;
      cursor: not-allowed;
    }

    /* FASE 9: Classes para paginacao (theme-aware) */
    .hover-pagination-btn {
      background-color: var(--hover-slate-700);
      transition: background-color 0.3s ease;
    }
    .hover-pagination-btn:hover:not(:disabled) {
      background-color: var(--hover-slate-600) !important;
    }

    .hover-pagination-page {
      transition: background-color 0.3s ease;
    }
    .hover-pagination-page:hover:not([data-active]) {
      background-color: var(--hover-slate-600) !important;
    }

    /* ModelPreviewModal - Performance Otimizado */
    .model-preview-content {
      color: var(--text-tertiary);
      line-height: 1.75;
      font-size: 1rem;
      user-select: text;
      -webkit-user-select: text;
    }
    .model-preview-content p {
      margin-bottom: 1em;
      color: var(--text-tertiary);
    }
    /* Selecao otimizada - cor solida sem transparencia */
    .model-preview-content ::selection {
      background-color: var(--selection-bg);
      color: var(--selection-text);
    }
    .model-preview-content ::-moz-selection {
      background-color: var(--selection-bg);
      color: var(--selection-text);
    }
    .model-preview-content strong {
      font-weight: 600;
      color: var(--text-primary);
    }
    .model-preview-content em {
      font-style: italic;
    }
    .model-preview-content ul,
    .model-preview-content ol {
      margin-left: 1.5em;
      margin-bottom: 1em;
      padding-left: 0.5em;
    }
    .model-preview-content li {
      margin-bottom: 0.5em;
      color: var(--text-tertiary);
    }
    .model-preview-content h1,
    .model-preview-content h2,
    .model-preview-content h3,
    .model-preview-content h4 {
      font-weight: 700;
      color: var(--text-primary);
      margin-top: 1.5em;
      margin-bottom: 0.75em;
      line-height: 1.3;
    }
    .model-preview-content h1 { font-size: 1.875rem; }
    .model-preview-content h2 { font-size: 1.5rem; }
    .model-preview-content h3 { font-size: 1.25rem; }
    .model-preview-content h4 { font-size: 1.125rem; }
    .model-preview-content blockquote {
      margin: 1.5em 0;
      padding-left: 1em;
      border-left: 4px solid var(--border-primary);
      color: var(--text-muted);
      font-style: italic;
    }

    /* GLOBAL EDITOR */
    .hover-cyan-700-from-600:hover:not(:disabled) {
      background-color: #0e7490 !important;
    }

    /* Secoes do Editor Global */
    .global-section {
      margin: 1.5rem 0;
      border-radius: 0.5rem;
      border: 1px solid var(--border-secondary);
      background-color: var(--bg-secondary);
    }

    .global-section:first-child {
      margin-top: 0;
    }

    .section-header {
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent);
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-secondary);
      border-radius: 0.5rem 0.5rem 0 0;
      user-select: none;
      pointer-events: none;
    }

    .section-header[contenteditable="false"] {
      cursor: default;
    }

    .section-title {
      font-weight: 700;
      font-size: 1rem;
      color: #60a5fa;
    }

    .section-category {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-left: 0.5rem;
    }

    .section-content {
      padding: 1rem;
      min-height: 80px;
    }

    .section-content:focus {
      outline: none;
    }

    .subsection {
      margin: 0.75rem 0;
      padding-left: 0.5rem;
      border-left: 3px solid var(--border-secondary);
    }

    .subsection-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      user-select: none;
      pointer-events: none;
    }

    .subsection-label[contenteditable="false"] {
      cursor: default;
    }

    /* Container do editor global (v1.11.2 - altura 100%) */
    .global-editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .global-editor-container .ql-toolbar {
      flex-shrink: 0;
    }

    .global-editor-container .ql-container {
      flex: 1;
      overflow-y: auto;
      min-height: 0; /* Importante para flexbox */
    }

    .global-editor-container .ql-editor {
      min-height: 100%;
    }

    /* v1.12.1: FieldEditor - Fix dupla scrollbar */
    .field-editor-content .ql-container {
      border: none !important;
    }

    .field-editor-content .ql-editor {
      max-height: 400px;
      overflow-y: auto;
      padding: 0.75rem;
    }

    .field-editor-content .ql-editor:focus {
      outline: none;
    }

  `}</style>
);

export { GlobalHoverStyles };
export default GlobalHoverStyles;
