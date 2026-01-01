/**
 * Utilitário para análise de provas
 * Funções auxiliares extraídas do fluxo de analyzeProof
 * v1.33.38
 */

/**
 * Aplica anonimização em um texto
 * @param {string} text - Texto original
 * @param {Array} names - Lista de nomes a anonimizar [{original, replacement}]
 * @returns {string} - Texto anonimizado
 */
export const anonymizeText = (text, names) => {
  if (!text || !names || names.length === 0) return text;

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
 * Escapa caracteres especiais para regex
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Formata o contexto de uma prova para envio à IA
 * @param {object} proof - Objeto da prova
 * @param {object} options - Opções de formatação
 * @returns {string} - Contexto formatado
 */
export const formatProofContext = (proof, options = {}) => {
  const {
    includeMetadata = true,
    includeLinkedTopics = false,
    maxLength = 50000
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
  if (includeLinkedTopics && proof.linkedTopics?.length > 0) {
    context += '\n\n📎 TÓPICOS VINCULADOS:\n';
    for (const topic of proof.linkedTopics) {
      context += `- ${topic.title}: ${topic.miniRelatorio || 'Sem mini-relatório'}\n`;
    }
  }

  return context;
};

/**
 * Valida se uma prova pode ser analisada
 * @param {object} proof - Objeto da prova
 * @returns {{valid: boolean, error?: string}}
 */
export const validateProofForAnalysis = (proof) => {
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
 * @param {string} analysisType - Tipo de análise ('contextual' ou 'livre')
 * @param {string} customInstructions - Instruções personalizadas
 * @param {string} proofContext - Contexto da prova
 * @returns {string} - Prompt formatado
 */
export const buildProofAnalysisPrompt = (analysisType, customInstructions, proofContext) => {
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
 * @param {string} response - Resposta da IA
 * @returns {object} - Informações estruturadas
 */
export const parseAnalysisResponse = (response) => {
  if (!response) return { raw: '', structured: null };

  // Tentar extrair seções numeradas
  const sections = {
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
