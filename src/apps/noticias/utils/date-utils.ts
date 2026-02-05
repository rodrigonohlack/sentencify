// ═══════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS - Formatação de Datas
// v1.41.0 - Funções para manipulação e formatação de datas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formata data para exibição relativa (ex: "há 2 horas", "ontem")
 * @param dateInput - Data a ser formatada (string ISO ou Date)
 * @returns String formatada com tempo relativo
 */
export const formatRelativeTime = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'agora';
  }

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  }

  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }

  if (diffDays === 1) {
    return 'ontem';
  }

  if (diffDays < 7) {
    return `há ${diffDays} dias`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `há ${weeks} sem`;
  }

  // Mais de um mês: formato curto
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  });
};

/**
 * Formata data completa para exibição
 * @param dateInput - Data a ser formatada
 * @returns String formatada (ex: "15 de janeiro de 2024, 14:30")
 */
export const formatFullDate = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata data curta para exibição
 * @param dateInput - Data a ser formatada
 * @returns String formatada (ex: "15/01/2024")
 */
export const formatShortDate = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Verifica se a data está dentro do período especificado
 * @param dateInput - Data a verificar
 * @param days - Número de dias para o período
 * @returns true se a data está dentro do período
 */
export const isWithinDays = (dateInput: string | Date, days: number): boolean => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays <= days;
};
