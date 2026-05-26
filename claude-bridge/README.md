# claude-bridge

Daemon local que expõe o `claude` CLI (Claude Code) como endpoint HTTP no formato
Messages API da Anthropic. Permite ao SentencifyAI usar o provider **"Claude Local (CLI)"**,
rodando inferência na assinatura do Claude Code (custo de API = $0).

## Requisitos
- Node 18+
- `claude` (Claude Code) instalado e **logado** (`claude` → `/login`)

## Uso
```bash
npm run claude-bridge          # sobe em http://127.0.0.1:8787
CLAUDE_BRIDGE_PORT=9999 npm run claude-bridge   # porta custom
```

No SentencifyAI, selecione o provider "Claude Local (CLI)". Funciona com o frontend
local (http://localhost:3000) ou em produção (https://sentencify.ia.br) — neste caso
use **Chrome** (Firefox bloqueia HTTPS→localhost).

## Limitações
- Sem streaming (resposta vem completa).
- `temperature`/`top_p`/`top_k`/`max_tokens` são ignorados (CLI não expõe).
- Sem prompt caching explícito.

## Troubleshooting
- **401 "não está logado"**: rode `claude` no terminal e `/login`.
- **"binário claude não encontrado"**: verifique `which claude`.
- **CORS bloqueado**: confirme que a origem está na allowlist em `server.js`.
