export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Expense {
  id: string;
  user_id: string;
  csv_import_id: string | null;
  purchase_date: string;
  card_holder: string | null;
  card_last_four: string | null;
  bank_category: string | null;
  description: string;
  installment: string | null;
  value_usd: number;
  exchange_rate: number;
  value_brl: number;
  category_id: string | null;
  category_source: 'bank' | 'llm' | 'manual';
  category_confidence: number | null;
  source: 'csv' | 'manual' | 'recurring';
  recurring_expense_id: string | null;
  is_refund: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface CSVImport {
  id: string;
  user_id: string;
  filename: string;
  file_hash: string;
  row_count: number;
  imported_count: number;
  skipped_count: number;
  created_at: string;
}

export interface CSVPreviewRow {
  index: number;
  isDuplicate: boolean;
  purchase_date: string;
  card_holder: string | null;
  card_last_four: string | null;
  bank_category: string | null;
  description: string;
  installment: string | null;
  value_usd: number;
  exchange_rate: number;
  value_brl: number;
  is_refund: number;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  description: string;
  value_brl: number;
  category_id: string | null;
  due_day: number;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface Settings {
  user_id: string;
  preferred_provider: 'gemini' | 'grok';
  default_view: string;
  reminder_days: number;
  updated_at: string;
}

export interface DashboardSummary {
  total_expenses: number;
  total_refunds: number;
  net_total: number;
  transaction_count: number;
  max_expense: number;
  max_expense_description: string | null;
  avg_per_day: number;
  change_percent: number;
  previous_total: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  count: number;
}

export interface HolderBreakdown {
  card_holder: string;
  card_last_four: string;
  total: number;
  count: number;
}

export interface TrendPoint {
  month: string;
  total: number;
  count: number;
}

export interface Reminder {
  id: string;
  description: string;
  value_brl: number;
  due_day: number;
  due_date: string;
  days_until: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type FinPage = 'dashboard' | 'expenses' | 'import' | 'recurring' | 'settings';
