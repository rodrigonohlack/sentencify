/**
 * @file ThemeStyles.tsx
 * @description CSS variables for light/dark theme support
 * @version 1.37.0
 */

/**
 * ThemeStyles Component
 * Renders CSS variables as a <style> tag for theme support
 * Includes dark theme (default) and light theme variants
 */
const ThemeStyles = () => (
  <style>{`
    /* DARK THEME (Default) */
    :root {

      /* Backgrounds */
      --bg-app: #0f172a;
      --bg-primary: #1e293b;
      --bg-secondary: #334155;
      --bg-tertiary: #475569;
      --bg-input: #334155;
      --bg-hover: #475569;
      --bg-card: rgba(51, 65, 85, 0.3);
      --bg-card-solid: #334155;

      /* Text */
      --text-primary: #ffffff;
      --text-secondary: #e2e8f0;
      --text-tertiary: #cbd5e1;
      --text-muted: #94a3b8;
      --text-disabled: #64748b;

      /* Borders */
      --border-primary: #475569;
      --border-secondary: #334155;
      --border-input: #475569;

      /* Modal/Overlay */
      --overlay-bg: rgba(0, 0, 0, 0.8);
      --modal-bg: #1e293b;
      --modal-border: #334155;
      --modal-glow: 0 0 40px rgba(139, 92, 246, 0.15), 0 0 80px rgba(59, 130, 246, 0.1);

      /* Gradients */
      --gradient-app-from: #0f172a;
      --gradient-app-via: #1e293b;
      --gradient-app-to: #0f172a;

      /* Hover state colors (for GlobalHoverStyles) */
      --hover-slate-500: #64748b;
      --hover-slate-600: #475569;
      --hover-slate-700: #334155;
      --hover-slate-800: #1e293b;

      /* Semi-transparent backgrounds */
      --bg-app-50: rgba(15, 23, 42, 0.5);
      --bg-primary-50: rgba(30, 41, 59, 0.5);
      --bg-secondary-50: rgba(51, 65, 85, 0.5);
      --bg-secondary-30: rgba(51, 65, 85, 0.3);
      --bg-tertiary-50: rgba(71, 85, 105, 0.5);
      --bg-tertiary-30: rgba(71, 85, 105, 0.3);

      /* Accent Colors - Dark Theme */
      --accent-amber: #fbbf24;
      --accent-amber-muted: #fcd34d;
      --accent-blue: #60a5fa;
      --accent-blue-muted: #93c5fd;
      --accent-purple: #c084fc;
      --accent-green: #4ade80;
      --accent-red: #f87171;

      /* Accent Backgrounds - Dark Theme */
      --accent-amber-bg: rgba(251, 191, 36, 0.15);
      --accent-blue-bg: rgba(96, 165, 250, 0.15);
      --accent-purple-bg: rgba(192, 132, 252, 0.15);
      --accent-green-bg: rgba(74, 222, 128, 0.15);
      --accent-red-bg: rgba(248, 113, 113, 0.15);

      /* Result Dropdown Colors - Dark Theme (light text on dark bg) */
      --result-green: #d1fae5;
      --result-red: #fee2e2;
      --result-amber: #fef3c7;
      --result-muted: #94a3b8;

      /* Special */
      --shadow-color: rgba(0, 0, 0, 0.5);
      --selection-bg: #3b82f6;
      --selection-text: #ffffff;
    }

    /* LIGHT THEME */
    [data-theme="light"] {
      /* Backgrounds */
      --bg-app: #f5f3ef;
      --bg-primary: #fefcf3;
      --bg-secondary: #e8e6e1;
      --bg-tertiary: #d4d2cd;
      --bg-input: #fefcf3;
      --bg-hover: #d4d2cd;
      --bg-card: rgba(254, 252, 243, 0.9);
      --bg-card-solid: #fefcf3;

      /* Text - Stone (warm gray) */
      --text-primary: #1c1917;
      --text-secondary: #292524;
      --text-tertiary: #44403c;
      --text-muted: #78716c;
      --text-disabled: #a8a29e;

      /* Borders - Stone (warm gray) */
      --border-primary: #a8a29e;
      --border-secondary: #d6d3d1;
      --border-input: #a8a29e;

      /* Modal/Overlay */
      --overlay-bg: rgba(0, 0, 0, 0.5);
      --modal-bg: #fefcf3;
      --modal-border: #d4d2cd;
      --modal-glow: 0 0 30px rgba(0, 0, 0, 0.1), 0 0 60px rgba(0, 0, 0, 0.05);

      /* Gradients */
      --gradient-app-from: #f5f3ef;
      --gradient-app-via: #fefcf3;
      --gradient-app-to: #f5f3ef;

      /* Hover state colors - Stone (warm gray) */
      --hover-slate-500: #78716c;
      --hover-slate-600: #a8a29e;
      --hover-slate-700: #d6d3d1;
      --hover-slate-800: #e7e5e3;

      /* Semi-transparent backgrounds - Stone (warm gray) */
      --bg-app-50: rgba(245, 243, 239, 0.5);
      --bg-primary-50: rgba(254, 252, 243, 0.5);
      --bg-secondary-50: rgba(214, 211, 209, 0.5);
      --bg-secondary-30: rgba(214, 211, 209, 0.3);
      --bg-tertiary-50: rgba(168, 162, 158, 0.5);
      --bg-tertiary-30: rgba(168, 162, 158, 0.3);

      /* Accent Colors - Light Theme (DARKER for contrast) */
      --accent-amber: #b45309;
      --accent-amber-muted: #d97706;
      --accent-blue: #1d4ed8;
      --accent-blue-muted: #2563eb;
      --accent-purple: #7c3aed;
      --accent-green: #15803d;
      --accent-red: #b91c1c;

      /* Accent Backgrounds - Light Theme (more visible) */
      --accent-amber-bg: rgba(251, 191, 36, 0.25);
      --accent-blue-bg: rgba(96, 165, 250, 0.25);
      --accent-purple-bg: rgba(192, 132, 252, 0.25);
      --accent-green-bg: rgba(74, 222, 128, 0.25);
      --accent-red-bg: rgba(248, 113, 113, 0.25);

      /* Result Dropdown Colors - Light Theme (DARKER for contrast) */
      --result-green: #047857;
      --result-red: #b91c1c;
      --result-amber: #b45309;
      --result-muted: #475569;

      /* Special */
      --shadow-color: rgba(0, 0, 0, 0.1);
      --selection-bg: #3b82f6;
      --selection-text: #ffffff;
    }

    /* UTILITY CLASSES - Backgrounds */
    .theme-bg-app { background-color: var(--bg-app); }
    .theme-bg-primary { background-color: var(--bg-primary); }
    .theme-bg-secondary { background-color: var(--bg-secondary); }
    .theme-bg-tertiary { background-color: var(--bg-tertiary); }
    .theme-bg-input { background-color: var(--bg-input); }
    .theme-bg-card { background-color: var(--bg-card); }
    .theme-bg-card-solid { background-color: var(--bg-card-solid); }
    .theme-bg-modal { background-color: var(--modal-bg); }
    .theme-bg-overlay { background-color: var(--overlay-bg); }
    .theme-bg-app-50 { background-color: var(--bg-app-50); }
    .theme-bg-primary-50 { background-color: var(--bg-primary-50); }
    .theme-bg-secondary-50 { background-color: var(--bg-secondary-50); }
    .theme-bg-secondary-30 { background-color: var(--bg-secondary-30); }
    .theme-bg-tertiary-50 { background-color: var(--bg-tertiary-50); }
    .theme-bg-tertiary-30 { background-color: var(--bg-tertiary-30); }

    /* Text */
    .theme-text-primary { color: var(--text-primary); }
    .theme-text-secondary { color: var(--text-secondary); }
    .theme-text-tertiary { color: var(--text-tertiary); }
    .theme-text-muted { color: var(--text-muted); }
    .theme-text-disabled { color: var(--text-disabled); }

    /* Accent Text (theme-aware) */
    .theme-text-amber { color: var(--accent-amber); }
    .theme-text-amber-muted { color: var(--accent-amber-muted); }
    .theme-text-blue { color: var(--accent-blue); }
    .theme-text-blue-muted { color: var(--accent-blue-muted); }
    .theme-text-purple { color: var(--accent-purple); }
    .theme-text-green { color: var(--accent-green); }
    .theme-text-red { color: var(--accent-red); }

    /* Accent Backgrounds (theme-aware) */
    .theme-bg-amber-accent { background-color: var(--accent-amber-bg); }
    .theme-bg-blue-accent { background-color: var(--accent-blue-bg); }
    .theme-bg-purple-accent { background-color: var(--accent-purple-bg); }
    .theme-bg-green-accent { background-color: var(--accent-green-bg); }
    .theme-bg-red-accent { background-color: var(--accent-red-bg); }

    /* Borders */
    .theme-border { border-color: var(--border-primary); }
    .theme-border-primary { border-color: var(--border-primary); }
    .theme-border-secondary { border-color: var(--border-secondary); }
    .theme-border-input { border-color: var(--border-input); }
    .theme-border-modal { border-color: var(--modal-border); }

    /* Dividers */
    .theme-divide { border-color: var(--border-secondary); }

    /* Placeholders */
    .theme-placeholder::placeholder { color: var(--text-muted); }

    /* Gradients */
    .theme-gradient-app {
      background: linear-gradient(to bottom right, var(--gradient-app-from), var(--gradient-app-via), var(--gradient-app-to));
    }
    .theme-gradient-card-50 {
      background: linear-gradient(to bottom right, var(--bg-primary-50), var(--bg-app-50));
    }

    /* Selection */
    .theme-selection::selection {
      background-color: var(--selection-bg);
      color: var(--selection-text);
    }

    /* Shadows */
    .theme-shadow {
      box-shadow: 0 25px 50px -12px var(--shadow-color);
    }

    /* Combined utility classes for common patterns */
    .theme-modal-overlay {
      background-color: var(--overlay-bg);
    }

    .theme-modal-container {
      background-color: var(--modal-bg);
      border-color: var(--modal-border);
    }

    .theme-input {
      background-color: var(--bg-input);
      border-color: var(--border-input);
      color: var(--text-primary);
    }
    .theme-input::placeholder {
      color: var(--text-muted);
    }

    .theme-card {
      background-color: var(--bg-card);
      border-color: var(--border-primary);
    }

    /* Hover utilities using CSS variables */
    .theme-hover-bg:hover:not(:disabled) {
      background-color: var(--bg-hover) !important;
    }

    .theme-hover-border:hover {
      border-color: var(--border-primary) !important;
    }

    /* Theme-aware button base (for slate buttons) */
    .theme-btn-secondary {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      border-color: var(--border-primary);
    }
    .theme-btn-secondary:hover:not(:disabled) {
      background-color: var(--bg-tertiary) !important;
    }

    /* Theme-aware tabs */
    .theme-tab {
      background-color: var(--bg-card);
      color: var(--text-tertiary);
      border-color: var(--border-secondary);
    }
    .theme-tab-active {
      background-color: var(--bg-primary);
      color: var(--text-primary);
    }

    /* Info box base styles (dark theme default) */
    .theme-info-box {
      background-color: rgba(30, 58, 138, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }
    .theme-warning-box {
      background-color: rgba(120, 53, 15, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }
    .theme-error-box {
      background-color: rgba(127, 29, 29, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }
    .theme-success-box {
      background-color: rgba(20, 83, 45, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }

    /* Info box variants for light theme */
    [data-theme="light"] .theme-info-box {
      background-color: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
    }
    [data-theme="light"] .theme-warning-box {
      background-color: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
    }
    [data-theme="light"] .theme-error-box {
      background-color: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
    }
    [data-theme="light"] .theme-success-box {
      background-color: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.3);
    }

    /* v1.22.02: Badge variants for status tags - dark theme default */
    .theme-badge-success {
      background-color: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .theme-badge-error {
      background-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .theme-badge-purple {
      background-color: rgba(168, 85, 247, 0.2);
      color: #a855f7;
    }
    .theme-badge-blue {
      background-color: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    /* Light theme badge adjustments */
    [data-theme="light"] .theme-badge-success {
      background-color: rgba(22, 163, 74, 0.15);
      color: #15803d;
    }
    [data-theme="light"] .theme-badge-error {
      background-color: rgba(220, 38, 38, 0.15);
      color: #b91c1c;
    }
    [data-theme="light"] .theme-badge-purple {
      background-color: rgba(147, 51, 234, 0.15);
      color: #7c3aed;
    }
    [data-theme="light"] .theme-badge-blue {
      background-color: rgba(37, 99, 235, 0.15);
      color: #1d4ed8;
    }

    /* Toast notification styles - dark theme default */
    .theme-toast-success {
      background-color: rgba(20, 83, 45, 0.95);
      border-color: rgba(34, 197, 94, 0.5);
      color: white;
    }
    .theme-toast-error {
      background-color: rgba(127, 29, 29, 0.95);
      border-color: rgba(239, 68, 68, 0.5);
      color: white;
    }
    .theme-toast-info {
      background-color: rgba(30, 58, 138, 0.95);
      border-color: rgba(59, 130, 246, 0.5);
      color: white;
    }
    .theme-toast-warning {
      background-color: rgba(120, 53, 15, 0.95);
      border-color: rgba(245, 158, 11, 0.5);
      color: white;
    }
    .theme-autosave {
      background-color: rgba(22, 101, 52, 0.95);
      border-color: rgba(34, 197, 94, 0.3);
      color: white;
    }

    /* Toast notification styles - light theme */
    [data-theme="light"] .theme-toast-success {
      background-color: rgba(34, 197, 94, 0.95);
      border-color: rgba(22, 101, 52, 0.5);
      color: white;
    }
    [data-theme="light"] .theme-toast-error {
      background-color: rgba(239, 68, 68, 0.95);
      border-color: rgba(185, 28, 28, 0.5);
      color: white;
    }
    [data-theme="light"] .theme-toast-info {
      background-color: rgba(59, 130, 246, 0.95);
      border-color: rgba(30, 64, 175, 0.5);
      color: white;
    }
    [data-theme="light"] .theme-toast-warning {
      background-color: rgba(254, 243, 199, 0.98);
      border-color: rgba(245, 158, 11, 0.5);
      color: #78350f;
    }
    [data-theme="light"] .theme-autosave {
      background-color: rgba(34, 197, 94, 0.95);
      border-color: rgba(22, 101, 52, 0.3);
      color: white;
    }

    /* v1.9.20: Fullscreen Editor - v1.9.31: SEM padding para eliminar gap */
    .editor-fullscreen {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 9999 !important;
      background: var(--bg-primary) !important;
      padding: 0.5rem !important;
      margin: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    /* v1.9.31: Garantir altura total do fullscreen - NAO afeta split-divider */
    .editor-fullscreen > .split-editor-pane,
    .editor-fullscreen > div:first-child:not(.split-divider) {
      flex: 1 1 0% !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      margin: 0 !important;
    }
    /* v1.9.31: Sem gap no inicio */
    .editor-fullscreen > div:first-child > *:first-child {
      margin-top: 0 !important;
    }
    /* v1.9.32: Removido override de .split-divider - a regra original e suficiente */
    /* v1.9.27: CSS simplificado para fullscreen (Quill recriado via key) */
    /* v1.9.32: CSS LIMPO - removido > * que afetava toolbar */
    .fullscreen-editor-wrapper {
      flex: 1 1 0% !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 0 !important;
      max-height: none !important;
      height: 100% !important;
      overflow: hidden !important;
    }
    /* v1.9.32: Regra especifica para ql-container (nao usa > * wildcard) */
    .fullscreen-editor-wrapper .ql-container {
      flex: 1 1 0% !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }
    .fullscreen-editor-wrapper .ql-editor {
      height: 100% !important;
      max-height: 100% !important;
      overflow-y: auto !important;
    }

    /* v1.9.28/v1.9.31: Forcar altura 100% no QuillEditorBase em fullscreen */
    .fullscreen-quill-fill {
      flex: 1 1 0% !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 0 !important;
      max-height: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
    }
    /* v1.9.32: Toolbar NAO expande - usa flex shorthand */
    .fullscreen-quill-fill .ql-toolbar {
      flex: 0 0 auto !important;
    }
    .fullscreen-quill-fill .ql-container {
      flex: 1 1 0% !important;
      min-height: 0 !important;
      max-height: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
    }
    .fullscreen-quill-fill .ql-editor {
      height: 100% !important;
      overflow-y: auto !important;
    }

    /* v1.10.13: Quick Edit no ModelPreviewModal - forca scroll interno no editor */
    .quick-edit-wrapper {
      display: flex !important;
      flex-direction: column !important;
    }
    .quick-edit-wrapper .ql-toolbar {
      flex: 0 0 auto !important;
    }
    .quick-edit-wrapper .ql-container {
      flex: 1 1 0% !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }
    .quick-edit-wrapper .ql-editor {
      flex: 1 1 0% !important;
      overflow-y: auto !important;
      min-height: 0 !important;
    }

    /* v1.9.22: Esconder tooltip do Quill (link removido) */
    .ql-tooltip {
      display: none !important;
    }

    /* v1.9.21: Split Window */
    .editor-fullscreen-split {
      display: flex !important;
      flex-direction: row !important;
    }
    .split-editor-pane {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }
    /* v1.9.34: Permitir width controlar tamanho em split mode (override flex: 1) */
    .editor-fullscreen.editor-fullscreen-split > .split-editor-pane {
      flex: none !important;
    }
    /* v1.9.33: Garantir interatividade do divider */
    .split-divider {
      width: 8px;
      background: var(--bg-secondary);
      cursor: col-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background-color 0.2s;
      z-index: 10;
      position: relative;
      pointer-events: auto !important;
      user-select: none;
    }
    .split-divider:hover {
      background: var(--bg-tertiary);
    }
    .split-divider-handle {
      color: var(--text-muted);
      opacity: 0.5;
    }
    .split-divider:hover .split-divider-handle {
      opacity: 1;
    }
    .model-search-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-primary);
      border-left: 1px solid var(--border-primary);
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}</style>
);

export { ThemeStyles };
export default ThemeStyles;
