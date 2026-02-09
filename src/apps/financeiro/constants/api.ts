export const API_BASE = '/api/financeiro';

export const ENDPOINTS = {
  // Expenses
  EXPENSES: `${API_BASE}/expenses`,
  EXPENSES_BULK_CATEGORY: `${API_BASE}/expenses/bulk-category`,

  // CSV
  CSV_BANKS: `${API_BASE}/csv/banks`,
  CSV_UPLOAD: `${API_BASE}/csv/upload`,
  CSV_CONFIRM: `${API_BASE}/csv/confirm`,
  CSV_IMPORTS: `${API_BASE}/csv/imports`,

  // Categorize
  CATEGORIZE_BATCH: `${API_BASE}/categorize/batch`,
  CATEGORIZE_SINGLE: `${API_BASE}/categorize/single`,
  CATEGORIZE_ALL: `${API_BASE}/categorize/uncategorized`,

  // Recurring
  RECURRING: `${API_BASE}/recurring`,
  RECURRING_GENERATE: `${API_BASE}/recurring/generate`,
  RECURRING_REMINDERS: `${API_BASE}/recurring/reminders`,

  // Dashboard
  DASHBOARD_SUMMARY: `${API_BASE}/dashboard/summary`,
  DASHBOARD_BY_CATEGORY: `${API_BASE}/dashboard/by-category`,
  DASHBOARD_BY_HOLDER: `${API_BASE}/dashboard/by-holder`,
  DASHBOARD_TRENDS: `${API_BASE}/dashboard/trends`,
  DASHBOARD_ALERTS: `${API_BASE}/dashboard/alerts`,

  // Settings
  SETTINGS: `${API_BASE}/settings`,
} as const;
