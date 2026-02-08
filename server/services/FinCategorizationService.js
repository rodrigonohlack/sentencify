const CATEGORIES = [
  { id: 'alimentacao', keywords: 'supermercados, padarias, restaurantes, bares, delivery, lanchonete, pizzaria, mercearia' },
  { id: 'saude', keywords: 'farmacias, medicos, hospitais, drogarias, farmacia, clinica' },
  { id: 'transporte', keywords: 'pedagios, estacionamento, Uber, transporte publico' },
  { id: 'combustivel', keywords: 'postos de gasolina, posto' },
  { id: 'moradia', keywords: 'aluguel, moveis, reforma, eletrodomesticos' },
  { id: 'assinaturas_tech', keywords: 'Claude AI, Google One, streaming, SaaS, subscription' },
  { id: 'vestuario', keywords: 'roupas, calcados, acessorios' },
  { id: 'lazer', keywords: 'parques, cinema, brinquedos, jogos, entretenimento' },
  { id: 'educacao', keywords: 'cursos, livros, escola' },
  { id: 'viagem', keywords: 'passagens aereas, hoteis, hospedagem, pousada' },
  { id: 'compras_gerais', keywords: 'lojas, varejo, departamento' },
  { id: 'servicos', keywords: 'servicos profissionais, pessoais, salao' },
  { id: 'automovel', keywords: 'oficina, pecas, manutencao, veiculos' },
  { id: 'outros', keywords: 'nao se encaixa nas anteriores' },
];

class FinCategorizationService {
  buildPrompt(expenses) {
    const categoryList = CATEGORIES.map(c => `- ${c.id}: ${c.keywords}`).join('\n');

    const expenseList = expenses
      .map((e, i) => `${i + 1}|${e.description}|${e.bank_category || 'sem categoria'}|${Math.abs(e.value_brl).toFixed(2)}`)
      .join('\n');

    return `Voce e um categorizador de despesas brasileiras. Classifique cada despesa em EXATAMENTE UMA categoria:
${categoryList}

Responda APENAS no formato: INDICE|CATEGORIA_ID (um por linha, sem explicacoes)

${expenseList}`;
  }

  parseResponse(responseText, expenseCount) {
    const results = [];
    const lines = responseText.trim().split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split('|');
      if (parts.length < 2) continue;

      const index = parseInt(parts[0], 10) - 1;
      const categoryId = parts[1].trim().toLowerCase();

      if (index >= 0 && index < expenseCount && CATEGORIES.some(c => c.id === categoryId)) {
        results.push({ index, category_id: categoryId });
      }
    }

    return results;
  }

  buildBatches(expenses, batchSize = 30) {
    const batches = [];
    for (let i = 0; i < expenses.length; i += batchSize) {
      batches.push(expenses.slice(i, i + batchSize));
    }
    return batches;
  }
}

export default new FinCategorizationService();
