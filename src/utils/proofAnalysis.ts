/**
 * Utilitário para análise de provas
 * Funções auxiliares extraídas do fluxo de analyzeProof
 * v1.33.38
 *
 * @version 1.35.80 - Migrado para TypeScript
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Nome para anonimização */
export interface AnonymizationName {
  original: string;
  replacement: string;
}

/** Prova para análise */
export interface ProofForAnalysis {
  name?: string;
  type?: string;
  date?: string;
  extractedText?: string;
  text?: string;
  linkedTopics?: Array<{
    title: string;
    miniRelatorio?: string;
  }>;
}

/** Opções de formatação de contexto */
export interface ProofContextOptions {
  includeMetadata?: boolean;
  includeLinkedTopics?: boolean;
  maxLength?: number;
}

/** Resultado de validação de prova */
export interface ProofValidationResult {
  valid: boolean;
  error?: string;
}

/** Seções estruturadas da análise */
export interface AnalysisSections {
  relevancia: string;
  fatos: string;
  valorProbatorio: string;
  sugestao: string;
}

/** Resultado do parse da análise */
export interface ParsedAnalysisResult {
  raw: string;
  structured: AnalysisSections | null;
}

/** Tipo de análise */
export type AnalysisType = 'contextual' | 'livre';

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escapa caracteres especiais para regex
 */
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES PÚBLICAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aplica anonimização em um texto
 * @param text - Texto original
 * @param names - Lista de nomes a anonimizar
 * @returns Texto anonimizado
 */
export const anonymizeText = (
  text: string | null | undefined,
  names: AnonymizationName[] | null | undefined
): string => {
  if (!text || !names || names.length === 0) return text || '';

  let result = text;
  for (const { original, replacement } of names) {
    if (original && replacement) {
      // Case-insensitive com word boundaries
      const regex = new RegExp(`\\b${escapeRegExp(original)}\\b`, 'gi');
      result = result.replace(regex, replacement);
    }
  }
  return result;
};

/**
 * Formata o contexto de uma prova para envio à IA
 * @param proof - Objeto da prova
 * @param options - Opções de formatação
 * @returns Contexto formatado
 */
export const formatProofContext = (
  proof: ProofForAnalysis,
  options: ProofContextOptions = {}
): string => {
  const {
    includeMetadata = true,
    includeLinkedTopics = false,
    // v1.37.79: Aumentado de 50k para 200k chars (~50 páginas de texto)
    maxLength = 200000
  } = options;

  let context = '';

  if (includeMetadata) {
    context += `📄 PROVA: ${proof.name || 'Sem nome'}\n`;
    if (proof.type) context += `Tipo: ${proof.type}\n`;
    if (proof.date) context += `Data: ${proof.date}\n`;
    context += '\n';
  }

  // Texto da prova
  const proofText = proof.extractedText || proof.text || '';
  context += proofText.substring(0, maxLength);

  if (proofText.length > maxLength) {
    context += '\n[... texto truncado ...]';
  }

  // Tópicos vinculados
  if (includeLinkedTopics && proof.linkedTopics && proof.linkedTopics.length > 0) {
    context += '\n\n📎 TÓPICOS VINCULADOS:\n';
    for (const topic of proof.linkedTopics) {
      context += `- ${topic.title}: ${topic.miniRelatorio || 'Sem mini-relatório'}\n`;
    }
  }

  return context;
};

/**
 * Valida se uma prova pode ser analisada
 * @param proof - Objeto da prova
 * @returns Resultado da validação
 */
export const validateProofForAnalysis = (
  proof: ProofForAnalysis | null | undefined
): ProofValidationResult => {
  if (!proof) {
    return { valid: false, error: 'Prova não fornecida' };
  }

  if (!proof.extractedText && !proof.text) {
    return { valid: false, error: 'Prova sem texto extraído' };
  }

  const text = proof.extractedText || proof.text || '';
  if (text.length < 10) {
    return { valid: false, error: 'Texto da prova muito curto (mínimo 10 caracteres)' };
  }

  return { valid: true };
};

/**
 * Prepara o prompt de análise de prova
 * @param analysisType - Tipo de análise ('contextual' ou 'livre')
 * @param customInstructions - Instruções personalizadas
 * @param proofContext - Contexto da prova
 * @returns Prompt formatado
 */
export const buildProofAnalysisPrompt = (
  analysisType: AnalysisType,
  customInstructions: string | null | undefined,
  proofContext: string
): string => {
  let prompt = '';

  if (analysisType === 'contextual') {
    prompt = `Analise a seguinte prova no contexto dos tópicos do processo:

${proofContext}

${customInstructions ? `INSTRUÇÕES ADICIONAIS:\n${customInstructions}\n\n` : ''}

Por favor, analise:
1. Relevância da prova para os tópicos discutidos
2. Fatos que a prova comprova ou contradiz
3. Valor probatório (forte, médio, fraco)
4. Sugestão de como utilizar na fundamentação`;

  } else {
    prompt = `Analise livremente a seguinte prova:

${proofContext}

${customInstructions ? `INSTRUÇÕES ADICIONAIS:\n${customInstructions}\n\n` : ''}

Por favor, forneça:
1. Resumo do conteúdo da prova
2. Principais informações extraídas
3. Observações relevantes`;
  }

  return prompt;
};

/**
 * Extrai informações estruturadas da resposta de análise
 * @param response - Resposta da IA
 * @returns Informações estruturadas
 */
export const parseAnalysisResponse = (
  response: string | null | undefined
): ParsedAnalysisResult => {
  if (!response) return { raw: '', structured: null };

  // Tentar extrair seções numeradas
  const sections: AnalysisSections = {
    relevancia: '',
    fatos: '',
    valorProbatorio: '',
    sugestao: ''
  };

  // Regex para encontrar seções numeradas
  const relevanciaMatch = response.match(/1\.\s*(?:Relevância|Relevancia)[:\s]*([\s\S]*?)(?=2\.|$)/i);
  const fatosMatch = response.match(/2\.\s*(?:Fatos)[:\s]*([\s\S]*?)(?=3\.|$)/i);
  const valorMatch = response.match(/3\.\s*(?:Valor\s*probat[óo]rio)[:\s]*([\s\S]*?)(?=4\.|$)/i);
  const sugestaoMatch = response.match(/4\.\s*(?:Sugest[ãa]o)[:\s]*([\s\S]*?)$/i);

  if (relevanciaMatch) sections.relevancia = relevanciaMatch[1].trim();
  if (fatosMatch) sections.fatos = fatosMatch[1].trim();
  if (valorMatch) sections.valorProbatorio = valorMatch[1].trim();
  if (sugestaoMatch) sections.sugestao = sugestaoMatch[1].trim();

  const hasStructure = Object.values(sections).some(v => v.length > 0);

  return {
    raw: response,
    structured: hasStructure ? sections : null
  };
};
