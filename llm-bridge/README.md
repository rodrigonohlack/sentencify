# llm-bridge

Daemon local que expõe os CLIs de LLM (`claude` / Claude Code e `codex` / ChatGPT)
como endpoints HTTP, traduzindo entre os formatos Messages API (Anthropic) e Chat
Completions (OpenAI) e os argumentos de cada CLI. Permite ao SentencifyAI usar os
providers **"Claude Local (CLI)"** e **"Codex Local (CLI)"**, rodando inferência na
assinatura do Claude Code / ChatGPT (custo de API = $0).

## Requisitos
- Node 18+
- `claude` (Claude Code) instalado e **logado** (`claude` → `/login`) — provider claude-cli
- `codex` instalado e **logado** (`codex login`) — provider codex-cli

## Uso
```bash
npm run llm-bridge          # sobe em http://127.0.0.1:8787
LLM_BRIDGE_PORT=9999 npm run llm-bridge   # porta custom (CLAUDE_BRIDGE_PORT ainda aceito como fallback)
```

Rotas: `POST /api/claude-cli/messages` (formato Anthropic) e `POST /api/codex-cli/messages`
(formato OpenAI). `GET /health` para checagem. `BRIDGE_LOG=verbose` despeja o stdout/stderr
cru do CLI para diagnóstico.

No SentencifyAI, selecione o provider "Claude Local (CLI)" ou "Codex Local (CLI)". Funciona
com o frontend local (http://localhost:3000) ou em produção (https://sentencify.ia.br) —
neste caso use **Chrome** (Firefox bloqueia HTTPS→localhost).

## Limitações
- Sem streaming (resposta vem completa).
- `temperature`/`top_p`/`top_k`/`max_tokens` são ignorados (CLIs não expõem).
- Sem prompt caching explícito.

## Troubleshooting
- **401 "não está logado"**: rode `claude`/`codex` no terminal e faça login.
- **"binário não encontrado"**: verifique `which claude` / `which codex`.
- **CORS bloqueado**: confirme que a origem está na allowlist em `server.js`.
