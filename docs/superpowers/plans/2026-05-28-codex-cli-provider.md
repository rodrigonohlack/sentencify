# Provider "Codex Local (CLI)" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o sétimo provider de IA `'codex-cli'` (Codex Local) ao SentencifyAI, simétrico ao `'claude-cli'`. Frontend reusa `callOpenAIAPI` com flag `localBridge: true`; daemon `claude-bridge` já existente ganha endpoint `/api/codex-cli/messages` que executa `codex exec --json` sob OAuth ChatGPT (custo $0).

**Architecture:** Provider novo no enum `AIProvider`. Campos `codexCliModel` (default `'gpt-5'`) e `codexCliReasoning` (`'minimal'|'low'|'medium'|'high'`, default `'medium'`) em `AISettings`. Sem API key. `callOpenAIAPI` ganha branch `if (localBridge)` que troca URL para `${getCodexCliBridgeUrl()}/api/codex-cli/messages`, omite header de auth e adiciona `reasoning` no body. Switches `callAI`/`callAIStream`/`callDoubleCheckAPIStream` ganham `case 'codex-cli'`. UI replica o que existe hoje para `claude-cli` em todos os 4 subapps + core. Não inclui PDF binário nem streaming nesta entrega.

**Tech Stack:** TypeScript, React, Zustand, Vitest. Lucide-react (`MessageCircle`) para ícone (espelhando família OpenAI).

**Spec de referência:** `docs/superpowers/specs/2026-05-28-codex-cli-provider-design.md`

---

## Task 1: Tipos `AIProvider`, `CodexCliReasoning`, `AISettings`, `APIKeys`

**Files:**
- Modify: `src/types/ai.ts:11` (enum `AIProvider`)
- Modify: `src/types/ai.ts:25-26` (após `ClaudeCliEffort`)
- Modify: `src/types/ai.ts:28-35` (`APIKeys`)
- Modify: `src/types/ai.ts:37-54` (`AISettings`)
- Modify: `src/types/index.ts:195` (enum `AIProvider`)
- Modify: `src/types/index.ts:202` (após `ClaudeCliEffort`)
- Modify: `src/types/index.ts:279-280` (após `claudeCliEffort?`)
- Modify: `src/types/index.ts:289` (campo `apiKeys`)

### Step 1: Editar `src/types/ai.ts`

- [ ] **1.1** — Substituir a linha 11 do `AIProvider` para incluir `'codex-cli'`:

```ts
export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli';
```

- [ ] **1.2** — Após a linha que define `ClaudeCliEffort` (linha ~26), adicionar:

```ts
/** Reasoning effort do codex-cli (--reasoning-effort flag do CLI) */
export type CodexCliReasoning = 'minimal' | 'low' | 'medium' | 'high';
```

- [ ] **1.3** — Em `APIKeys` (após `'claude-cli'?: string;` linha ~34), adicionar:

```ts
  'codex-cli'?: string; // Sem API key — usa OAuth ChatGPT local
```

- [ ] **1.4** — Em `AISettings` (após `claudeCliEffort?: ClaudeCliEffort;` linha ~41), adicionar:

```ts
  codexCliModel?: string;
  codexCliReasoning?: CodexCliReasoning;
```

### Step 2: Editar `src/types/index.ts` (espelhar)

- [ ] **2.1** — Substituir a linha 195 do `AIProvider` para incluir `'codex-cli'`:

```ts
export type AIProvider = 'claude' | 'gemini' | 'openai' | 'grok' | 'deepseek' | 'claude-cli' | 'codex-cli';
```

- [ ] **2.2** — Após a linha que define `ClaudeCliEffort` (linha ~202), adicionar:

```ts
/** Reasoning effort do codex-cli (--reasoning-effort flag do CLI) */
export type CodexCliReasoning = 'minimal' | 'low' | 'medium' | 'high';
```

- [ ] **2.3** — Após `claudeCliEffort?:` na interface principal (linha ~280), adicionar:

```ts
  codexCliModel?: string;
  codexCliReasoning?: CodexCliReasoning;
```

- [ ] **2.4** — Atualizar a tipagem inline de `apiKeys` na linha ~289. Substituir:

```ts
  apiKeys: { claude: string; gemini: string; openai: string; grok: string; deepseek: string; 'claude-cli'?: string };
```

por:

```ts
  apiKeys: { claude: string; gemini: string; openai: string; grok: string; deepseek: string; 'claude-cli'?: string; 'codex-cli'?: string };
```

### Step 3: Verificar tipos

- [ ] **3** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos. (Pode haver warnings preexistentes — relevante é não introduzir nada vermelho ligado a `codex-cli` ou tipos novos.)

### Step 4: Commit

- [ ] **4** — Commit:

```bash
git add src/types/ai.ts src/types/index.ts
git commit -m "types(codex-cli): add provider, reasoning, settings, apiKeys"
```

---

## Task 2: Util `src/utils/codex-cli-bridge.ts` (TDD)

**Files:**
- Create: `src/utils/codex-cli-bridge.ts`
- Create: `src/utils/codex-cli-bridge.test.ts`

### Step 1: Escrever o teste falhando

- [ ] **1** — Criar `src/utils/codex-cli-bridge.test.ts` com:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from './codex-cli-bridge';

describe('codex-cli-bridge', () => {
  beforeEach(() => { localStorage.clear(); });

  it('usa a URL default quando não há override', () => {
    expect(getCodexCliBridgeUrl()).toBe('http://localhost:8787');
  });

  it('respeita override em localStorage', () => {
    localStorage.setItem('sentencify-codex-cli-bridge-url', 'http://localhost:9999');
    expect(getCodexCliBridgeUrl()).toBe('http://localhost:9999');
  });

  it('expõe o path do endpoint de mensagens', () => {
    expect(CODEX_CLI_MESSAGES_PATH).toBe('/api/codex-cli/messages');
  });
});
```

### Step 2: Rodar o teste para verificar que falha

- [ ] **2** — Rodar:

```bash
npx vitest run src/utils/codex-cli-bridge.test.ts
```

Expected: FAIL — módulo `codex-cli-bridge` não encontrado.

### Step 3: Implementar o util

- [ ] **3** — Criar `src/utils/codex-cli-bridge.ts` com:

```ts
/**
 * @file codex-cli-bridge.ts
 * @description URL e path do daemon local (provider "Codex Local (CLI)").
 *              Por default aponta para o mesmo daemon claude-bridge na porta
 *              8787, mas mantém override próprio em localStorage para permitir
 *              configurar daemons separados se necessário.
 */

const DEFAULT_BRIDGE_URL = 'http://localhost:8787';
const OVERRIDE_KEY = 'sentencify-codex-cli-bridge-url';

/** Path do endpoint de mensagens no daemon (formato Chat Completions). */
export const CODEX_CLI_MESSAGES_PATH = '/api/codex-cli/messages';

/** Retorna a URL base do bridge, com override opcional via localStorage. */
export function getCodexCliBridgeUrl(): string {
  try {
    return localStorage.getItem(OVERRIDE_KEY) || DEFAULT_BRIDGE_URL;
  } catch {
    return DEFAULT_BRIDGE_URL;
  }
}
```

### Step 4: Rodar o teste para verificar que passa

- [ ] **4** — Rodar:

```bash
npx vitest run src/utils/codex-cli-bridge.test.ts
```

Expected: PASS (3 testes).

### Step 5: Commit

- [ ] **5** — Commit:

```bash
git add src/utils/codex-cli-bridge.ts src/utils/codex-cli-bridge.test.ts
git commit -m "feat(codex-cli): util getCodexCliBridgeUrl + MESSAGES_PATH"
```

---

## Task 3: Store factory `createAIStore.ts` + testes

**Files:**
- Modify: `src/stores/shared/createAIStore.ts` (linhas 48-64 defaults, 113-117 setModel, 200-220 selectCurrentModel)
- Modify: `src/stores/shared/createAIStore.test.ts` (acrescentar casos)

### Step 1: Adicionar caso de teste para o novo provider

- [ ] **1** — Abrir `src/stores/shared/createAIStore.test.ts` e adicionar (junto dos testes existentes de `setModel`/`selectCurrentModel`):

```ts
describe('codex-cli provider support', () => {
  const { useStore } = createAIStore({
    persistName: 'test-codex-cli',
    apiKeyStorageKey: 'test-codex-cli-keys'
  });

  beforeEach(() => {
    useStore.getState().resetSettings();
  });

  it('tem defaults codexCliModel e codexCliReasoning', () => {
    const s = useStore.getState().aiSettings;
    expect(s.codexCliModel).toBe('gpt-5');
    expect(s.codexCliReasoning).toBe('medium');
  });

  it('setModel("codex-cli", id) grava em codexCliModel', () => {
    useStore.getState().setModel('codex-cli', 'gpt-5-codex');
    expect(useStore.getState().aiSettings.codexCliModel).toBe('gpt-5-codex');
  });

  it('selectCurrentModel devolve codexCliModel quando provider=codex-cli', () => {
    useStore.getState().setProvider('codex-cli');
    useStore.getState().setModel('codex-cli', 'gpt-5-codex');
    expect(selectCurrentModel(useStore.getState())).toBe('gpt-5-codex');
  });

  it('selectCurrentModel cai em "gpt-5" se codexCliModel for vazio', () => {
    useStore.getState().setProvider('codex-cli');
    useStore.setState((s) => ({
      ...s,
      aiSettings: { ...s.aiSettings, codexCliModel: '' }
    }));
    expect(selectCurrentModel(useStore.getState())).toBe('gpt-5');
  });
});
```

> Note: importar `selectCurrentModel` do mesmo módulo se ainda não estiver importado no topo do arquivo de teste.

### Step 2: Rodar o teste para verificar que falha

- [ ] **2** — Rodar:

```bash
npx vitest run src/stores/shared/createAIStore.test.ts
```

Expected: FAIL — `codexCliModel` undefined / `selectCurrentModel` não trata caso novo.

### Step 3: Atualizar `DEFAULT_AI_SETTINGS`

- [ ] **3** — Em `src/stores/shared/createAIStore.ts:48-64`, dentro de `DEFAULT_AI_SETTINGS` (após as linhas 51-52 do `claudeCliModel`/`claudeCliEffort`), inserir:

```ts
  codexCliModel: 'gpt-5',
  codexCliReasoning: 'medium' as const,
```

### Step 4: Atualizar `setModel`

- [ ] **4** — Em `src/stores/shared/createAIStore.ts:112-117`, substituir o corpo de `setModel` por:

```ts
        setModel: (provider, model) =>
          set((state) => {
            // claude-cli e codex-cli têm chaves próprias (não seguem o padrão `${provider}Model`)
            const specialKeys: Partial<Record<AIProvider, keyof AISettings>> = {
              'claude-cli': 'claudeCliModel',
              'codex-cli': 'codexCliModel'
            };
            const key = (specialKeys[provider] ?? `${provider}Model`) as keyof AISettings;
            return { aiSettings: { ...state.aiSettings, [key]: model } };
          }),
```

### Step 5: Atualizar `selectCurrentModel`

- [ ] **5** — Em `src/stores/shared/createAIStore.ts:202-220`, substituir o destructuring e o switch por:

```ts
export const selectCurrentModel = (state: AIStoreBase): string => {
  const { provider, claudeModel, claudeCliModel, codexCliModel, geminiModel, openaiModel, grokModel, deepseekModel } = state.aiSettings;
  switch (provider) {
    case 'claude':
      return claudeModel;
    case 'claude-cli':
      return claudeCliModel || 'claude-sonnet-4-6';
    case 'codex-cli':
      return codexCliModel || 'gpt-5';
    case 'gemini':
      return geminiModel;
    case 'openai':
      return openaiModel;
    case 'grok':
      return grokModel;
    case 'deepseek':
      return deepseekModel;
    default:
      return claudeModel;
  }
};
```

### Step 6: Rodar os testes (factory + suite inteira)

- [ ] **6** — Rodar:

```bash
npx vitest run src/stores/shared/createAIStore.test.ts
```

Expected: PASS — incluindo os 4 testes novos + os que já existiam.

### Step 7: Verificar tipos

- [ ] **7** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

### Step 8: Commit

- [ ] **8** — Commit:

```bash
git add src/stores/shared/createAIStore.ts src/stores/shared/createAIStore.test.ts
git commit -m "feat(codex-cli): defaults, setModel branch, selectCurrentModel"
```

---

## Task 4: Store core `useAIStore.ts` (espelhar)

**Files:**
- Modify: `src/stores/useAIStore.ts` (defaults + setModel + selectCurrentModel — buscar pelos espelhos exatos do que está no `claude-cli`)

### Step 1: Localizar pontos a modificar

- [ ] **1** — Rodar:

```bash
grep -n "claudeCliModel\|claudeCliEffort\|claude-cli" src/stores/useAIStore.ts
```

Anotar os números de linha — provavelmente há um bloco de `DEFAULT_AI_SETTINGS` análogo e um switch de `selectCurrentModel`.

### Step 2: Adicionar defaults

- [ ] **2** — No bloco de defaults (logo após `claudeCliModel: ...` e `claudeCliEffort: ...`), inserir:

```ts
  codexCliModel: 'gpt-5',
  codexCliReasoning: 'medium' as const,
```

### Step 3: Adicionar branch no `setModel` (se existir versão própria)

- [ ] **3** — Se houver `setModel` próprio no store core (provavelmente sim), aplicar mesma lógica do Task 3 Step 4 — branch para `'codex-cli'` mapeando para `codexCliModel`.

### Step 4: Adicionar caso no `selectCurrentModel` (se existir versão própria)

- [ ] **4** — Se houver, adicionar:

```ts
case 'codex-cli':
  return codexCliModel || 'gpt-5';
```

### Step 5: Verificar tipos

- [ ] **5** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

### Step 6: Commit

- [ ] **6** — Commit:

```bash
git add src/stores/useAIStore.ts
git commit -m "feat(codex-cli): core store defaults + setModel/select"
```

---

## Task 5: Constants `AI_PROVIDERS` — 4 subapps

**Files:**
- Modify: `src/apps/analisador/constants/models.ts`
- Modify: `src/apps/embargos/constants/models.ts`
- Modify: `src/apps/noticias/constants/models.ts`
- Modify: `src/apps/prova-oral/constants/models.ts`

### Step 1: Adicionar entrada em `AI_PROVIDERS` — 4 vezes

- [ ] **1** — Em cada um dos 4 arquivos acima, adicionar a entrada `'codex-cli'` dentro do objeto `AI_PROVIDERS` (após a entrada `'claude-cli'`):

```ts
'codex-cli': {
  name: 'Codex Local (CLI)',
  icon: 'message-circle',
  models: [
    {
      id: 'gpt-5',
      name: 'GPT-5',
      recommended: true,
      description: 'Generalista — recomendado para análise jurídica'
    },
    {
      id: 'gpt-5-codex',
      name: 'GPT-5 Codex',
      description: 'Variante tuned para coding (uso alternativo)'
    }
  ]
},
```

### Step 2: Verificar tipos

- [ ] **2** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos. (TypeScript vai cobrar que `Record<AIProvider, ProviderInfo>` esteja completo — adicionar a entrada satisfaz o tipo agora que `'codex-cli'` faz parte do enum.)

### Step 3: Commit

- [ ] **3** — Commit:

```bash
git add src/apps/{analisador,embargos,noticias,prova-oral}/constants/models.ts
git commit -m "feat(codex-cli): registra provider e modelos nos 4 subapps"
```

---

## Task 6: `ProviderIcon.tsx` — `case 'codex-cli'` (TDD)

**Files:**
- Modify: `src/components/ui/ProviderIcon.tsx:99-115`
- Modify: `src/components/ui/ProviderIcon.test.tsx`

### Step 1: Escrever o teste falhando

- [ ] **1** — Em `src/components/ui/ProviderIcon.test.tsx`, adicionar (após o bloco `describe('ClaudeCLI', …)` na linha ~198):

```tsx
  // ═══════════════════════════════════════════════════════════════════════════
  // CODEX-CLI PROVIDER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CodexCLI', () => {
    it('deve renderizar um SVG para o provider codex-cli', () => {
      const { container } = render(<ProviderIcon provider="codex-cli" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('usa o mesmo path do OpenAIIcon (família OpenAI)', () => {
      const { container: codexContainer } = render(<ProviderIcon provider="codex-cli" />);
      const { container: openaiContainer } = render(<ProviderIcon provider="openai" />);

      const codexPath = codexContainer.querySelector('svg path')?.getAttribute('d');
      const openaiPath = openaiContainer.querySelector('svg path')?.getAttribute('d');

      expect(codexPath).toBe(openaiPath);
    });
  });
```

### Step 2: Rodar o teste para verificar que falha

- [ ] **2** — Rodar:

```bash
npx vitest run src/components/ui/ProviderIcon.test.tsx
```

Expected: FAIL — sem case para `'codex-cli'`, switch cai no `default: return null`, o `<svg>` não é encontrado.

### Step 3: Adicionar o case

- [ ] **3** — Em `src/components/ui/ProviderIcon.tsx:111` (antes do `default:`), adicionar:

```tsx
    case 'codex-cli':
      return <OpenAIIcon size={size} className={className} />;
```

### Step 4: Rodar o teste para verificar que passa

- [ ] **4** — Rodar:

```bash
npx vitest run src/components/ui/ProviderIcon.test.tsx
```

Expected: PASS.

### Step 5: Commit

- [ ] **5** — Commit:

```bash
git add src/components/ui/ProviderIcon.tsx src/components/ui/ProviderIcon.test.tsx
git commit -m "feat(codex-cli): ProviderIcon usa OpenAIIcon"
```

---

## Task 7: `callOpenAIAPI` no core ganha branch `localBridge`

**Files:**
- Modify: `src/hooks/useAIIntegration.ts` (callOpenAIAPI ~linha 1043-1156)

### Step 1: Adicionar import do util

- [ ] **1** — No topo de `src/hooks/useAIIntegration.ts`, junto do import existente de `getClaudeCliBridgeUrl`/`CLAUDE_CLI_MESSAGES_PATH`, **estender** para incluir o bridge do codex:

```ts
import { getClaudeCliBridgeUrl, CLAUDE_CLI_MESSAGES_PATH } from '../utils/claude-cli-bridge';
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from '../utils/codex-cli-bridge';
```

### Step 2: Estender `callOpenAIAPI` com branch `localBridge`

- [ ] **2** — Na função `callOpenAIAPI` (linha ~1043), no destructuring de options (~linha 1054), **adicionar** `localBridge = false`:

```ts
    const {
      maxTokens = OPENAI_CONFIG.MAX_TOKENS_DEFAULT,
      systemPrompt = null,
      useInstructions = false,
      model = aiSettings.openaiModel || 'gpt-5.2-chat-latest',
      timeout = null,
      abortSignal = null,
      logMetrics = true,
      extractText = true,
      disableThinking = false,
      localBridge = false
    } = options;
```

- [ ] **3** — Dentro de `makeRequest` (linha ~1078), **substituir** o bloco que monta `requestBody` + `fetch` (linhas ~1080-1101). Substituir:

```ts
        const openaiMessages = convertToOpenAIFormat(messages, finalSystemPrompt);

        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

        // Adicionar reasoning apenas para gpt-5.2 (nao gpt-5.2-chat-latest)
        if (model === 'gpt-5.2' && !disableThinking) {
          requestBody.reasoning = { effort: reasoningLevel };
        }

        const response = await fetch(`${API_BASE}/api/openai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys?.openai || ''
          },
          body: JSON.stringify(requestBody),
          signal
        });
```

por:

```ts
        const openaiMessages = convertToOpenAIFormat(messages, finalSystemPrompt);

        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

        // Adicionar reasoning apenas para gpt-5.2 (nao gpt-5.2-chat-latest)
        if (model === 'gpt-5.2' && !disableThinking) {
          requestBody.reasoning = { effort: reasoningLevel };
        }

        // Provider codex-cli: roteia para o daemon local e adiciona reasoning_effort string
        // (campo oficial OpenAI para o3/o4/gpt-5 — evita colisão com `reasoning: {effort}` do gpt-5.2)
        if (localBridge) {
          requestBody.reasoning_effort = aiSettings.codexCliReasoning || 'medium';
        }

        const url = localBridge
          ? `${getCodexCliBridgeUrl()}${CODEX_CLI_MESSAGES_PATH}`
          : `${API_BASE}/api/openai/chat`;
        const headers: Record<string, string> = localBridge
          ? { 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys?.openai || '' };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal
        });
```

### Step 3: Atualizar dependências do `useCallback`

- [ ] **4** — Na lista de deps do `useCallback` do `callOpenAIAPI` (linha ~1156), `aiSettings` já está lá, então `codexCliReasoning` é coberto. Sem mudança.

### Step 4: Verificar tipos

- [ ] **5** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

### Step 5: Commit

- [ ] **6** — Commit:

```bash
git add src/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): callOpenAIAPI core suporta localBridge"
```

---

## Task 8: Switches do core `useAIIntegration.ts` — `case 'codex-cli'`

**Files:**
- Modify: `src/hooks/useAIIntegration.ts` (callAI ~1404, callAIStream ~2079, callDoubleCheckAPIStream ~2108)

### Step 1: Adicionar branch em `callAI`

- [ ] **1** — Em `src/hooks/useAIIntegration.ts:1441` (logo após o bloco `if (provider === 'claude-cli')`), inserir:

```ts
    // Provider codex-cli: roteia para o daemon claude-bridge (assinatura ChatGPT, custo $0)
    if (provider === 'codex-cli') {
      return await callOpenAIAPI(messages, {
        ...options,
        localBridge: true,
        model: options.model || aiSettings.codexCliModel || 'gpt-5'
      });
    }
```

- [ ] **2** — Atualizar deps do `useCallback` de `callAI` (linha ~1454):

Substituir:
```ts
  }, [aiSettings, callLLM, callGeminiAPI, callOpenAIAPI, callGrokAPI, callDeepseekAPI]);
```

(já tem `aiSettings` que cobre `codexCliModel`; sem mudança real necessária — confirmar).

### Step 2: Adicionar branch em `callAIStream`

- [ ] **3** — Em `src/hooks/useAIIntegration.ts:2097` (logo após o `case 'claude-cli':` do switch), inserir um novo case:

```ts
      case 'codex-cli':
        // v1 sem streaming: cai para o caminho não-stream via bridge local
        return callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5' });
```

- [ ] **4** — Atualizar deps do `useCallback` de `callAIStream` (linha ~2102) para incluir `aiSettings.codexCliModel` e `callOpenAIAPI`:

Substituir:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream, callLLM]);
```

por:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, aiSettings.codexCliModel, callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream, callLLM, callOpenAIAPI]);
```

### Step 3: Adicionar branch em `callDoubleCheckAPIStream`

- [ ] **5** — Em `src/hooks/useAIIntegration.ts:2169` (logo após o `if (provider === 'claude-cli')`), inserir:

```ts
    if (provider === 'codex-cli') {
      return await callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5' });
    }
```

- [ ] **6** — Atualizar deps de `callDoubleCheckAPIStream` (linha ~2174) para incluir `aiSettings.codexCliModel` e `callOpenAIAPI`:

Substituir:
```ts
  }, [callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream, callLLM, aiSettings.doubleCheck, aiSettings.claudeCliModel]);
```

por:
```ts
  }, [callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream, callLLM, callOpenAIAPI, aiSettings.doubleCheck, aiSettings.claudeCliModel, aiSettings.codexCliModel]);
```

### Step 4: Verificar tipos

- [ ] **7** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

### Step 5: Commit

- [ ] **8** — Commit:

```bash
git add src/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): switches callAI/Stream/DoubleCheck — case codex-cli"
```

---

## Task 9: Subapp `analisador` — `callOpenAIAPI` + switches

**Files:**
- Modify: `src/apps/analisador/hooks/useAIIntegration.ts` (imports topo + callOpenAIAPI ~202 + switches ~1012-1042)

### Step 1: Adicionar import do util

- [ ] **1** — No topo (junto da linha 9 onde importa `getClaudeCliBridgeUrl`):

```ts
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from '../../../utils/codex-cli-bridge';
```

### Step 2: Estender `callOpenAIAPI` (linhas ~202-289)

- [ ] **2** — No destructuring de options (linha ~206), adicionar `localBridge = false`:

```ts
    const {
      maxTokens = 8000,
      systemPrompt = null,
      model = aiSettings.openaiModel,
      localBridge = false
    } = options;
```

- [ ] **3** — Substituir a montagem do `requestBody` + `fetch` (linhas ~240-258). Substituir:

```ts
        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

        // Adicionar reasoning_effort para modelo com thinking
        if (isReasoningModel) {
          requestBody.reasoning_effort = reasoningLevel;
        }

        const response = await fetch(`${API_BASE}/api/openai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiSettings.apiKeys.openai
          },
          body: JSON.stringify(requestBody)
        });
```

por:

```ts
        const requestBody: Record<string, unknown> = {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens
        };

        // Adicionar reasoning_effort para modelo OpenAI com thinking
        if (isReasoningModel) {
          requestBody.reasoning_effort = reasoningLevel;
        }

        // Provider codex-cli: bridge local + reasoning string nativa
        if (localBridge) {
          requestBody.reasoning_effort = aiSettings.codexCliReasoning || 'medium';
        }

        const url = localBridge
          ? `${getCodexCliBridgeUrl()}${CODEX_CLI_MESSAGES_PATH}`
          : `${API_BASE}/api/openai/chat`;
        const headers: Record<string, string> = localBridge
          ? { 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json', 'x-api-key': aiSettings.apiKeys.openai };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
```

### Step 3: Adicionar branches nos switches

- [ ] **4** — No `callAIStream` (linha ~1012-1018), após o `case 'claude-cli':`, inserir:

```ts
      case 'codex-cli':
        // v1 sem streaming: cai para callOpenAIAPI via bridge local
        return callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5' });
```

- [ ] **5** — Atualizar deps da linha 1018:

Substituir:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, callClaudeAPI, callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream]);
```

por:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, aiSettings.codexCliModel, callClaudeAPI, callClaudeAPIStream, callGeminiAPIStream, callOpenAIAPI, callOpenAIAPIStream, callGrokAPIStream, callDeepseekAPIStream]);
```

- [ ] **6** — No `callAI` (linha ~1037-1042), após `case 'claude-cli':`, inserir:

```ts
      case 'codex-cli':
        return callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5' });
```

- [ ] **7** — Atualizar deps da linha 1042:

Substituir:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, callClaudeAPI, callGeminiAPI, callOpenAIAPI, callGrokAPI, callDeepseekAPI]);
```

por:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, aiSettings.codexCliModel, callClaudeAPI, callGeminiAPI, callOpenAIAPI, callGrokAPI, callDeepseekAPI]);
```

### Step 4: Verificar tipos

- [ ] **8** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

### Step 5: Commit

- [ ] **9** — Commit:

```bash
git add src/apps/analisador/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): analisador hook — callOpenAIAPI bridge + switches"
```

---

## Task 10: Subapp `embargos` — `callOpenAIAPI` + switches

**Files:**
- Modify: `src/apps/embargos/hooks/useAIIntegration.ts`

Estrutura idêntica ao analisador (Task 9). Aplicar exatamente os mesmos diffs nos pontos correspondentes.

- [ ] **1** — Localizar pontos:

```bash
grep -n "callOpenAIAPI\|callClaudeAPI\|localBridge\|claude-cli\|claudeCli" src/apps/embargos/hooks/useAIIntegration.ts
```

- [ ] **2** — Adicionar import do util `codex-cli-bridge` no topo (junto do import de `claude-cli-bridge`):

```ts
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from '../../../utils/codex-cli-bridge';
```

- [ ] **3** — Em `callOpenAIAPI` (linha ~202), adicionar `localBridge = false` no destructuring e replicar a substituição do bloco `requestBody + fetch` exatamente como em Task 9 Step 3.

- [ ] **4** — Adicionar `case 'codex-cli':` nos switches de `callAIStream` e `callAI` exatamente como em Task 9 Steps 4-7.

- [ ] **5** — Atualizar deps dos `useCallback` em ambos os switches para incluir `aiSettings.codexCliModel` e `callOpenAIAPI`.

- [ ] **6** — Verificar tipos:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

- [ ] **7** — Commit:

```bash
git add src/apps/embargos/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): embargos hook — callOpenAIAPI bridge + switches"
```

---

## Task 11: Subapp `noticias` — `callOpenAIAPI` + switches

**Files:**
- Modify: `src/apps/noticias/hooks/useAIIntegration.ts`

Estrutura idêntica. Aplicar exatamente o mesmo padrão de Tasks 9-10.

- [ ] **1** — Localizar pontos:

```bash
grep -n "callOpenAIAPI\|callClaudeAPI\|localBridge\|claude-cli\|claudeCli" src/apps/noticias/hooks/useAIIntegration.ts
```

- [ ] **2** — Adicionar import:

```ts
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from '../../../utils/codex-cli-bridge';
```

- [ ] **3** — Em `callOpenAIAPI` (linha ~196), adicionar `localBridge = false` no destructuring e substituir o bloco `requestBody + fetch` (mesmo padrão das tasks anteriores).

- [ ] **4** — Em `callAI` (não há `callAIStream` em noticias — confirmar via grep), no switch (linha ~475-487), após `case 'claude-cli':`, inserir:

```ts
      case 'codex-cli':
        return callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5' });
```

- [ ] **5** — Atualizar deps do `useCallback` (linha ~489):

Substituir:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, callClaudeAPI, callGeminiAPI, callOpenAIAPI, callGrokAPI, callDeepseekAPI]);
```

por:
```ts
  }, [aiSettings.provider, aiSettings.claudeCliModel, aiSettings.codexCliModel, callClaudeAPI, callGeminiAPI, callOpenAIAPI, callGrokAPI, callDeepseekAPI]);
```

- [ ] **6** — Verificar tipos:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

- [ ] **7** — Commit:

```bash
git add src/apps/noticias/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): noticias hook — callOpenAIAPI bridge + switches"
```

---

## Task 12: Subapp `prova-oral` — `callOpenAIAPI` + switches

**Files:**
- Modify: `src/apps/prova-oral/hooks/useAIIntegration.ts`

Estrutura idêntica ao analisador. Tem ambos `callAI` (linha ~520-534) e `callAIStream` (linha ~1096-1111).

- [ ] **1** — Localizar pontos:

```bash
grep -n "callOpenAIAPI\|callClaudeAPI\|localBridge\|claude-cli\|claudeCli" src/apps/prova-oral/hooks/useAIIntegration.ts
```

- [ ] **2** — Adicionar import:

```ts
import { getCodexCliBridgeUrl, CODEX_CLI_MESSAGES_PATH } from '../../../utils/codex-cli-bridge';
```

- [ ] **3** — Em `callOpenAIAPI` (linha ~237), adicionar `localBridge = false` no destructuring e substituir o bloco `requestBody + fetch`.

- [ ] **4** — Em `callAIStream` (linha ~1096-1111), após `case 'claude-cli':`, inserir:

```ts
      case 'codex-cli':
        return callOpenAIAPI(messages, { ...options, localBridge: true, model: options.model || aiSettings.codexCliModel || 'gpt-5' });
```

- [ ] **5** — Em `callAI` (linha ~520-534), após `case 'claude-cli':`, inserir o mesmo case.

- [ ] **6** — Atualizar deps de ambos os `useCallback` para incluir `aiSettings.codexCliModel` e `callOpenAIAPI`.

- [ ] **7** — Verificar tipos:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

- [ ] **8** — Commit:

```bash
git add src/apps/prova-oral/hooks/useAIIntegration.ts
git commit -m "feat(codex-cli): prova-oral hook — callOpenAIAPI bridge + switches"
```

---

## Task 13: `AIProviderSelector` — 4 subapps

**Files:**
- Modify: `src/apps/analisador/components/settings/AIProviderSelector.tsx`
- Modify: `src/apps/embargos/components/settings/AIProviderSelector.tsx`
- Modify: `src/apps/noticias/components/settings/AIProviderSelector.tsx`
- Modify: `src/apps/prova-oral/components/settings/AIProviderSelector.tsx`

### Step 1: Em cada arquivo

- [ ] **1** — Em cada um dos 4 arquivos, substituir o import do lucide-react para adicionar `MessageCircle` (já está importado mas confirmar):

```tsx
import { Brain, Sparkles, MessageCircle, Zap, Check } from 'lucide-react';
```

- [ ] **2** — Estender o map `providerIcons` (linha ~12-19). Adicionar a entrada `'codex-cli'`:

```tsx
const providerIcons: Record<AIProvider, React.ReactNode> = {
  claude: <Brain className="w-5 h-5" />,
  'claude-cli': <Brain className="w-5 h-5" />,
  gemini: <Sparkles className="w-5 h-5" />,
  openai: <MessageCircle className="w-5 h-5" />,
  'codex-cli': <MessageCircle className="w-5 h-5" />,
  grok: <Zap className="w-5 h-5" />,
  deepseek: <Zap className="w-5 h-5" />
};
```

- [ ] **3** — Estender o subtitle do tile (linha ~68 — varia por arquivo). Substituir:

```tsx
{key === 'claude-cli'
  ? 'Sem chave — usa OAuth local'
  : hasApiKey ? 'API Key configurada' : 'API Key não configurada'}
```

por:

```tsx
{key === 'claude-cli' || key === 'codex-cli'
  ? 'Sem chave — usa OAuth local'
  : hasApiKey ? 'API Key configurada' : 'API Key não configurada'}
```

- [ ] **4** — No `noticias` (que tem variação de cor — linha ~67), aplicar o mesmo `||` ao operador ternário do `className`:

Substituir:
```tsx
<p className={`text-xs ${key === 'claude-cli' ? 'theme-text-muted' : hasApiKey ? 'text-green-400' : 'theme-text-muted'}`}>
```

por:
```tsx
<p className={`text-xs ${key === 'claude-cli' || key === 'codex-cli' ? 'theme-text-muted' : hasApiKey ? 'text-green-400' : 'theme-text-muted'}`}>
```

### Step 2: Verificar tipos

- [ ] **5** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos. TypeScript exige que o `Record<AIProvider, …>` esteja completo, o que valida que adicionamos `'codex-cli'` em todos os 4 maps.

### Step 3: Commit

- [ ] **6** — Commit:

```bash
git add src/apps/{analisador,embargos,noticias,prova-oral}/components/settings/AIProviderSelector.tsx
git commit -m "feat(codex-cli): AIProviderSelector — tile MessageCircle"
```

---

## Task 14: `ConfigModal` core — botão provider, selects de modelo/reasoning, doubleCheck

**Files:**
- Modify: `src/components/modals/ConfigModal.tsx`

### Step 1: Importar tipo `CodexCliReasoning`

- [ ] **1** — No topo do arquivo, garantir que o import do `src/types` inclui o `CodexCliReasoning`:

```bash
grep -n "ClaudeCliEffort\|CodexCliReasoning" src/components/modals/ConfigModal.tsx | head -5
```

Se `ClaudeCliEffort` está sendo importado (provavelmente sim), adicionar `CodexCliReasoning` na mesma linha de import.

### Step 2: Adicionar botão do provider

- [ ] **2** — Em `src/components/modals/ConfigModal.tsx:478` (logo após o `</button>` que fecha o botão do Claude Local), inserir o botão do Codex Local:

```tsx
              <button
                onClick={() => setAiSettings({ ...aiSettings, provider: 'codex-cli' })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  aiSettings.provider === 'codex-cli'
                    ? 'bg-emerald-600/20 border-emerald-500'
                    : 'theme-bg-secondary-30 theme-border-input hover-theme-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ProviderIcon provider="codex-cli" size={20} className="text-emerald-400" />
                  <div>
                    <div className="font-semibold theme-text-primary text-sm">Codex Local</div>
                    <div className="text-xs theme-text-muted">CLI · assinatura</div>
                  </div>
                </div>
              </button>
```

### Step 3: Atualizar label do "Modelo X" (linha ~484)

- [ ] **3** — Substituir:

```tsx
                Modelo {aiSettings.provider === 'claude' || aiSettings.provider === 'claude-cli' ? 'Claude' :
                       aiSettings.provider === 'gemini' ? 'Gemini' :
                       aiSettings.provider === 'openai' ? 'OpenAI' :
                       aiSettings.provider === 'grok' ? 'Grok' : 'DeepSeek'}:
```

por:

```tsx
                Modelo {aiSettings.provider === 'claude' || aiSettings.provider === 'claude-cli' ? 'Claude' :
                       aiSettings.provider === 'gemini' ? 'Gemini' :
                       aiSettings.provider === 'openai' ? 'OpenAI' :
                       aiSettings.provider === 'codex-cli' ? 'Codex' :
                       aiSettings.provider === 'grok' ? 'Grok' : 'DeepSeek'}:
```

### Step 4: Adicionar select de modelo do Codex (após o select do `claude-cli`)

- [ ] **4** — Logo após o `</select>` do bloco `{aiSettings.provider === 'claude-cli' && (` (linha ~508), inserir:

```tsx
              {aiSettings.provider === 'codex-cli' && (
                <select
                  value={aiSettings.codexCliModel || 'gpt-5'}
                  onChange={(e) => setAiSettings({ ...aiSettings, codexCliModel: e.target.value })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="gpt-5">GPT-5 (assinatura · $0)</option>
                  <option value="gpt-5-codex">GPT-5 Codex (assinatura · $0)</option>
                </select>
              )}
```

### Step 5: Adicionar dropdown de reasoning effort (após o do `claude-cli`)

- [ ] **5** — Logo após o `</div>` que fecha o bloco `{aiSettings.provider === 'claude-cli' && (` na seção de thinking (linha ~883), inserir:

```tsx
            {/* CODEX-CLI: Dropdown de reasoning effort */}
            {aiSettings.provider === 'codex-cli' && (
              <div>
                <label className="block text-xs theme-text-muted mb-1">Nível de raciocínio (reasoning):</label>
                <select
                  value={aiSettings.codexCliReasoning || 'medium'}
                  onChange={(e) => setAiSettings({ ...aiSettings, codexCliReasoning: e.target.value as CodexCliReasoning })}
                  className="w-full px-3 py-2 theme-bg-secondary border theme-border-input rounded text-sm theme-text-secondary"
                >
                  <option value="minimal">Minimal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <p className="text-xs theme-text-muted mt-1">
                  Controla o esforço de raciocínio do Codex CLI local (<code>--reasoning-effort</code>). Maior = mais lento e mais a fundo.
                </p>
              </div>
            )}
```

### Step 6: doubleCheck — adicionar codex-cli no `defaultModels`

- [ ] **6** — Em `src/components/modals/ConfigModal.tsx:1196-1203`, substituir o map `defaultModels`:

```tsx
                      const defaultModels: Record<AIProvider, string> = {
                        claude: 'claude-sonnet-4-20250514',
                        'claude-cli': 'claude-sonnet-4-20250514',
                        gemini: 'gemini-3-flash-preview',
                        openai: 'gpt-5.2-chat-latest',
                        grok: 'grok-4-1-fast-reasoning',
                        deepseek: 'deepseek-v4-flash'
                      };
```

por:

```tsx
                      const defaultModels: Record<AIProvider, string> = {
                        claude: 'claude-sonnet-4-20250514',
                        'claude-cli': 'claude-sonnet-4-20250514',
                        gemini: 'gemini-3-flash-preview',
                        openai: 'gpt-5.2-chat-latest',
                        grok: 'grok-4-1-fast-reasoning',
                        deepseek: 'deepseek-v4-flash',
                        'codex-cli': 'gpt-5'
                      };
```

### Step 7: doubleCheck — adicionar `<option>` no select de provider

- [ ] **7** — Em `src/components/modals/ConfigModal.tsx:1216`, logo após `<option value="claude-cli">Claude Local (CLI · assinatura)</option>`, inserir:

```tsx
                    <option value="codex-cli">Codex Local (CLI · assinatura)</option>
```

### Step 8: doubleCheck — adicionar modelos do codex-cli no select de modelo

- [ ] **8** — Em `src/components/modals/ConfigModal.tsx:1254-1259` (bloco de options do openai), inserir um novo bloco após o do `openai`:

```tsx
                    {aiSettings.doubleCheck?.provider === 'codex-cli' && (
                      <>
                        <option value="gpt-5">GPT-5 (assinatura · $0)</option>
                        <option value="gpt-5-codex">GPT-5 Codex (assinatura · $0)</option>
                      </>
                    )}
```

### Step 9: providerColors — adicionar codex-cli

- [ ] **9** — Em `src/components/modals/ConfigModal.tsx:3030-3037`, substituir:

```tsx
                              const providerColors = {
                                claude: 'text-orange-400',
                                'claude-cli': 'text-amber-400',
                                gemini: 'text-blue-400',
                                openai: 'text-green-400',
                                grok: 'text-gray-400',
                                deepseek: 'text-indigo-400'
                              };
```

por:

```tsx
                              const providerColors = {
                                claude: 'text-orange-400',
                                'claude-cli': 'text-amber-400',
                                gemini: 'text-blue-400',
                                openai: 'text-green-400',
                                'codex-cli': 'text-emerald-400',
                                grok: 'text-gray-400',
                                deepseek: 'text-indigo-400'
                              };
```

### Step 10: Atualizar "Modelo atual" display

- [ ] **10** — Em `src/components/modals/ConfigModal.tsx:3253-3263`, substituir:

```tsx
                  {aiSettings.provider === 'gemini'
                    ? getModelDisplayName(aiSettings.geminiModel || '')
                    : aiSettings.provider === 'openai'
                    ? getModelDisplayName(aiSettings.openaiModel || 'gpt-5.2-chat-latest')
                    : aiSettings.provider === 'grok'
                    ? getModelDisplayName(aiSettings.grokModel || 'grok-4-1-fast-reasoning')
                    : aiSettings.provider === 'deepseek'
                    ? (aiSettings.deepseekModel ? getModelDisplayName(aiSettings.deepseekModel) : '— selecione um modelo —')
                    : aiSettings.provider === 'claude-cli'
                    ? getModelDisplayName(aiSettings.claudeCliModel || 'claude-sonnet-4-6')
                    : getModelDisplayName(aiSettings.claudeModel || aiSettings.model || '')}
```

por:

```tsx
                  {aiSettings.provider === 'gemini'
                    ? getModelDisplayName(aiSettings.geminiModel || '')
                    : aiSettings.provider === 'openai'
                    ? getModelDisplayName(aiSettings.openaiModel || 'gpt-5.2-chat-latest')
                    : aiSettings.provider === 'grok'
                    ? getModelDisplayName(aiSettings.grokModel || 'grok-4-1-fast-reasoning')
                    : aiSettings.provider === 'deepseek'
                    ? (aiSettings.deepseekModel ? getModelDisplayName(aiSettings.deepseekModel) : '— selecione um modelo —')
                    : aiSettings.provider === 'claude-cli'
                    ? getModelDisplayName(aiSettings.claudeCliModel || 'claude-sonnet-4-6')
                    : aiSettings.provider === 'codex-cli'
                    ? getModelDisplayName(aiSettings.codexCliModel || 'gpt-5')
                    : getModelDisplayName(aiSettings.claudeModel || aiSettings.model || '')}
```

### Step 11: Verificar tipos

- [ ] **11** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros novos.

### Step 12: Commit

- [ ] **12** — Commit:

```bash
git add src/components/modals/ConfigModal.tsx
git commit -m "feat(codex-cli): ConfigModal — provider, modelo, reasoning, doubleCheck"
```

---

## Task 15: Bump de versão (5 arquivos — guideline 8)

**Files:**
- Modify: `CLAUDE.md` (linha 7)
- Modify: `src/App.tsx` (`APP_VERSION` ~linha 209)
- Modify: `src/constants/changelog.js` (nova entrada no topo)
- Modify: `package.json`

### Step 1: CLAUDE.md

- [ ] **1** — Em `CLAUDE.md:7`, substituir:

```markdown
**Version**: 1.48.0 | **File**: `src/App.tsx` (~160 KB) | **Runtime**: Standalone + Render
```

por:

```markdown
**Version**: 1.49.0 | **File**: `src/App.tsx` (~160 KB) | **Runtime**: Standalone + Render
```

### Step 2: src/App.tsx

- [ ] **2** — Localizar:

```bash
grep -n "APP_VERSION" src/App.tsx | head -3
```

Substituir o valor `'1.48.0'` por `'1.49.0'` na linha da const `APP_VERSION`.

### Step 3: package.json

- [ ] **3** — Em `package.json`, substituir `"version": "1.48.0"` por `"version": "1.49.0"`.

### Step 4: changelog.js — nova entrada no topo

- [ ] **4** — Em `src/constants/changelog.js`, adicionar logo após o `[` inicial do array (no topo da lista):

```js
  {
    version: '1.49.0',
    date: '2026-05-28',
    changes: [
      {
        type: 'feat',
        title: 'Provider Codex Local (CLI) — assinatura ChatGPT, custo $0',
        description:
          'Sétimo provider simétrico ao Claude Local: executa Codex CLI via daemon claude-bridge ' +
          '(endpoint /api/codex-cli/messages) sob OAuth ChatGPT. Modelos gpt-5 (default) e gpt-5-codex. ' +
          'Reasoning effort minimal/low/medium/high. Disponível em todos os apps. Requer codex CLI ' +
          'instalado, codex login executado, e daemon claude-bridge rodando.'
      }
    ]
  },
```

### Step 5: Commit

- [ ] **5** — Commit:

```bash
git add CLAUDE.md src/App.tsx src/constants/changelog.js package.json
git commit -m "chore(release): v1.49.0 — provider Codex Local (CLI)"
```

---

## Task 16: Verificação final — tsc + suite de testes

### Step 1: TypeScript

- [ ] **1** — Rodar:

```bash
npx tsc --noEmit
```

Expected: zero erros.

### Step 2: Suite de testes

- [ ] **2** — Rodar:

```bash
npx vitest run
```

Expected: todos os testes passam. Atenção especial para:
- `src/utils/codex-cli-bridge.test.ts` — 3 testes
- `src/stores/shared/createAIStore.test.ts` — testes novos do codex-cli
- `src/components/ui/ProviderIcon.test.tsx` — teste novo
- Nenhum teste preexistente quebrou

### Step 3: Sanity manual

- [ ] **3** — Rodar o app:

```bash
npm run dev
```

E checar manualmente:
- Abrir ConfigModal: o botão "Codex Local" aparece com ícone OpenAI (verde-esmeralda quando selecionado)
- Selecionando "Codex Local": aparece o select de modelo (`gpt-5` / `gpt-5-codex`) e o select de reasoning effort (minimal/low/medium/high)
- doubleCheck: o `<option>` "Codex Local (CLI · assinatura)" aparece, e ao selecioná-lo o select de modelo lista gpt-5 / gpt-5-codex
- Em qualquer subapp: o tile "Codex Local (CLI)" aparece no `AIProviderSelector` com ícone MessageCircle e legenda "Sem chave — usa OAuth local"

> Note: testar uma chamada real só faz sentido com o daemon implementando o endpoint `/api/codex-cli/messages` — esse trabalho é de outro repositório e está fora do escopo deste plano. Sem o endpoint, o frontend devolverá erro 404 ao tentar usar o provider, mas a UI estará 100% funcional para configuração.

### Step 4: Commit final (se algum ajuste foi necessário em Step 3)

- [ ] **4** — Se ajustes manuais foram feitos:

```bash
git add -A
git commit -m "chore(codex-cli): ajustes de UI pós-verificação manual"
```

---

## Self-review checklist (referência durante a execução)

- [ ] `'codex-cli'` aparece em **todos** os switches/maps com `Record<AIProvider, …>` (TS força a completude)
- [ ] `callOpenAIAPI` no core + 4 subapps tem branch `if (localBridge)`
- [ ] Switches `callAI`/`callAIStream`/`callDoubleCheckAPIStream` têm `case 'codex-cli'` no core + 4 subapps (onde existem)
- [ ] Tests novos passam; testes preexistentes não quebram
- [ ] `tsc --noEmit` passa
- [ ] Bump v1.49.0 nos 5 arquivos
- [ ] Nenhuma adição ao `PROVIDERS_WITH_PDF_BINARY` (codex-cli é text-only)
- [ ] Nenhuma referência a `claudeCliEffort` foi modificada (codex usa `codexCliReasoning` separado)
