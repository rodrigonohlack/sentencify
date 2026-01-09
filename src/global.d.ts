/**
 * Global type declarations for Sentencify
 * @version 1.35.78
 */

// ═══════════════════════════════════════════════════════════════════════════
// WINDOW EXTENSIONS
// ═══════════════════════════════════════════════════════════════════════════

interface Window {
  __reloadSessionFromStorage?: () => void;
  testSanitization?: (html: string) => string;
  checkDOMPurify?: () => { version: string; isSupported: boolean };
}

// ═══════════════════════════════════════════════════════════════════════════
// BROADCAST CHANNEL EXTENSION
// ═══════════════════════════════════════════════════════════════════════════

interface BroadcastChannel {
  onerror: ((err: unknown) => void) | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMPURIFY EXTENSION
// ═══════════════════════════════════════════════════════════════════════════

interface DOMPurifyInstance {
  sanitize(dirty: string, config?: object): string;
  version: string;
  isSupported: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESSERACT WORKER EXTENSION
// ═══════════════════════════════════════════════════════════════════════════

interface TesseractWorker {
  setParameters: (params: Record<string, unknown>) => Promise<void>;
  recognize: (image: unknown) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUILL EXTENSION
// ═══════════════════════════════════════════════════════════════════════════

interface QuillConstructor {
  find: (element: Element) => unknown | null;
  import: (path: string) => unknown;
  register: (path: string, module: unknown, options?: boolean) => void;
}
