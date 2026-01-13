# GEMINI.md

## Project Overview

**SentencifyAI** is a React-based legal decision-support tool designed for Brazilian labor court judges. It assists in drafting legal sentences by analyzing documents (PDFs), managing legal models, and integrating with AI (Gemini, Claude) for text generation and analysis.

**Core Technologies:**
*   **Frontend:** React 19, Vite, Tailwind CSS.
*   **Backend:** Node.js, Express.js (runs on Render).
*   **Database:** SQLite (Sync), IndexedDB (Client-side offline storage).
*   **AI:** Gemini (Google), Claude (Anthropic), Local Models (Transformers.js via Web Workers for NER/Embeddings).
*   **Testing:** Vitest (Unit), Playwright (E2E).

## Architecture & Codebase Structure

### Monolithic `App.jsx`
*   **Critical Note:** The file `src/App.jsx` is a massive (~1.3MB, ~35k lines) monolithic file that contains the majority of the application's logic, including custom hooks, UI components, and utility functions.
*   **Navigation:** It features a detailed "Index" at the top (lines 1-220) mapping sections to line numbers. Always consult this index or search for specific component names when modifying the frontend.
*   **Refactoring:** While some hooks and components exist in `src/hooks/` and `src/components/`, `App.jsx` remains the central hub.

### Backend (`server/`)
*   **Entry Point:** `server/index.js`.
*   **API Routes:** `server/routes/` handles Auth (Magic Link), AI proxies (Claude/Gemini), Sync, and Admin tasks.
*   **Data:** Uses SQLite for cloud synchronization of user models.

### Data Management (`LEGIS/`, `JURIS/`)
*   The project processes raw legal documents (`.docx`, `.json`) into structured JSON data.
*   **Client-Side Loading:** These JSONs (Legislation, Jurisprudence) are often loaded into IndexedDB for fast, offline access.
*   **Embeddings:** Pre-computed embeddings are used for semantic search, hosted via CDN (GitHub Releases) to avoid large bundle sizes.

## Development & Usage

### Setup & Run
*   **Install Dependencies:** `npm install`
*   **Development Server:** `npm run dev` (Starts both client `localhost:3000` and server `localhost:3001` concurrently).
*   **Production Build:** `npm run build`

### Testing
*   **Unit Tests:** `npm run test` (Vitest).
*   **E2E Tests:** `npm run test:e2e` (Playwright).
*   **Test UI:** `npm run test:ui` / `npm run test:e2e:ui`.

### Key Conventions
0.  **Strict Modification Rule:** NEVER modify, create, or delete any file unless the user EXPLICITAMENTE determines so in a specific command. Evaluation, planning, and auditing do not imply permission to execute changes.
1.  **Conventions:** Follow the patterns in `App.jsx`. If adding a new small component, it might belong inside `App.jsx` unless a refactor is planned.
2.  **State Management:** Heavy reliance on custom hooks (`useAIIntegration`, `useLocalStorage`, `useModalManager`) managed within `App.jsx`.
3.  **Styling:** Tailwind CSS is used extensively.
4.  **AI Safety:** "Thinking" logs from AI models are monitored. Rate limiting is enforced on the backend.
5.  **Environment Variables:** Check `.env.example` for required keys (Gemini/Claude API keys, DB config).

## Deployment

*   **Production:** Render (Node.js service). Supports persistent disk for SQLite.
*   **Backup:** Vercel (Serverless).
*   **Configuration:** See `render.yaml` and `vercel.json`.

## Quick Links
*   **Frontend Entry:** `src/main.jsx`
*   **Main Logic:** `src/App.jsx`
*   **Backend Entry:** `server/index.js`
*   **E2E Tests:** `e2e/`
