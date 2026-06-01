# Seletor de fonte configurável

**Data:** 2026-06-01
**Versão alvo:** v1.50.46

## Problema

A fonte serifada institucional (Spectral) foi aplicada de forma **hard-coded** em três
arquivos (`index.html`, `src/index.css`, `tailwind.config.js`), como "experimento". O
usuário quer flexibilizar: oferecer, em Configurações, a escolha entre Spectral, Calibri
(via Carlito) e outras famílias conhecidas, valendo em todo o aplicativo.

## Decisões de design

| Tema | Decisão |
|------|---------|
| **Escopo da troca** | Substitui a Spectral em **todos** os pontos onde ela é aplicada hoje: títulos `h1–h4` (UI, BaseModal, tópicos) **e** o editor de sentença (`.sentence-serif`, `.field-editor-content`). |
| **Origem das fontes** | **Google Fonts (CDN)** — mesmo padrão dos `<link>` de Spectral/Outfit já existentes. Sem peso de bundle, sem questão de licença. |
| **Catálogo** | Spectral (padrão) · Lora · Source Serif 4 · Merriweather · EB Garamond · Carlito (≡ Calibri) · Inter. |
| **Carregamento** | **Dinâmico**: a Spectral (default) permanece com `<link>` estático no `index.html` (sem FOUT no boot); as demais só baixam quando selecionadas. |
| **Alcance** | **Global** — app principal e todos os subapps (Prova Oral, Embargos, Analisador, Financeiro), via variável CSS no `document.documentElement`. |
| **UI** | Nova seção **"Aparência"** no `ConfigModal`, como primeira seção do corpo. |

## Arquitetura

Ponto único de verdade: variável CSS **`--app-font`** em `document.documentElement`.
Trocar a fonte = trocar o valor dessa variável. As regras CSS referenciam-na com fallback
para a Spectral, então nada muda visualmente até o usuário escolher outra família.

### Artefatos

1. **`src/constants/fonts.ts`** (novo) — catálogo:
   ```ts
   export interface FontOption {
     id: string;              // 'spectral', 'lora', ...
     label: string;           // 'Spectral', 'Carlito (Calibri)', ...
     stack: string;           // valor de --app-font, ex.: "'Lora', Georgia, serif"
     googleFontsHref: string | null; // URL do <link>; null = já carregada estaticamente (Spectral)
   }
   export const DEFAULT_FONT_ID = 'spectral';
   export const FONT_CATALOG: readonly FontOption[];
   ```
   Famílias sans (Carlito, Inter) trazem stack sem-serifa para o fallback não cair em serifa.

2. **`src/hooks/useFontPreference.ts`** (novo) — espelho de `useThemeManagement`:
   - estado iniciado do `localStorage` (chave `sentencify-app-font`, default `spectral`);
   - `useEffect` que: injeta o `<link>` da fonte (se ainda não presente e `href != null`),
     seta `--app-font` no `document.documentElement.style` e persiste no `localStorage`;
   - retorna `{ fontId, setFontId, fonts }`.
   - Exportado no barrel `src/hooks/index.ts`.

3. **`src/index.css`** — nos dois blocos, trocar `'Spectral', Georgia, serif` por
   `var(--app-font, 'Spectral', Georgia, serif)`.

4. **`tailwind.config.js`** — `fontFamily.serif` vira
   `['var(--app-font)', 'Spectral', 'Georgia', 'serif']` (cobre os usos da classe `font-serif`).

5. **`src/components/modals/ConfigModal.tsx`** — nova seção "Aparência" (primeira do corpo)
   com um seletor das 7 fontes; cada opção exibe o próprio nome renderizado na respectiva
   família (preview ao vivo). **Header inalterado** (testes fixam título/subtítulo).

6. **Versionamento** (v1.50.46): `CLAUDE.md`, `package.json`, `src/constants/app-version.ts`,
   `src/constants/changelog.js`.

## Compatibilidade

- Default `spectral` + fallback no `var()` ⇒ comportamento idêntico ao atual para quem não
  mexe na config.
- Funciona em tema claro e escuro (a variável é ortogonal ao tema).
- `localStorage` separado por origem; preferência persiste entre sessões.

## Fora de escopo

- Tamanho de fonte (já existe `useFontSizeControl`).
- Fontes self-hosted / upload de fontes próprias.
- Fonte distinta por subapp ou por título-vs-corpo (uma escolha única e global).
