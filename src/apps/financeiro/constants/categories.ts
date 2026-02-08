import type { Category } from '../types';

export const CATEGORIES: Category[] = [
  { id: 'alimentacao', name: 'Alimentacao', icon: 'UtensilsCrossed', color: '#f97316', sort_order: 1 },
  { id: 'saude', name: 'Saude', icon: 'Heart', color: '#ef4444', sort_order: 2 },
  { id: 'transporte', name: 'Transporte', icon: 'Car', color: '#3b82f6', sort_order: 3 },
  { id: 'combustivel', name: 'Combustivel', icon: 'Fuel', color: '#f59e0b', sort_order: 4 },
  { id: 'moradia', name: 'Moradia', icon: 'Home', color: '#8b5cf6', sort_order: 5 },
  { id: 'assinaturas_tech', name: 'Assinaturas / Tech', icon: 'Monitor', color: '#6366f1', sort_order: 6 },
  { id: 'vestuario', name: 'Vestuario', icon: 'Shirt', color: '#ec4899', sort_order: 7 },
  { id: 'lazer', name: 'Lazer', icon: 'Gamepad2', color: '#a855f7', sort_order: 8 },
  { id: 'educacao', name: 'Educacao', icon: 'GraduationCap', color: '#14b8a6', sort_order: 9 },
  { id: 'viagem', name: 'Viagem', icon: 'Plane', color: '#06b6d4', sort_order: 10 },
  { id: 'compras_gerais', name: 'Compras Gerais', icon: 'ShoppingBag', color: '#f43f5e', sort_order: 11 },
  { id: 'servicos', name: 'Servicos', icon: 'Wrench', color: '#64748b', sort_order: 12 },
  { id: 'automovel', name: 'Automovel', icon: 'CarFront', color: '#d97706', sort_order: 13 },
  { id: 'outros', name: 'Outros', icon: 'CircleDot', color: '#94a3b8', sort_order: 14 },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
