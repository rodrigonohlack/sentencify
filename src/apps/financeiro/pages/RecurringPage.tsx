import { useEffect, useState } from 'react';
import { Repeat, CalendarPlus } from 'lucide-react';
import { useRecurringStore } from '../stores/useRecurringStore';
import { useRecurring } from '../hooks/useRecurring';
import { Button, Spinner, EmptyState } from '../components/ui';
import RecurringForm from '../components/recurring/RecurringForm';
import RecurringCard from '../components/recurring/RecurringCard';
import Header from '../components/layout/Header';
import type { RecurringExpense } from '../types';

export default function RecurringPage() {
  const { recurring, isLoading } = useRecurringStore();
  const { fetchRecurring, createRecurring, updateRecurring, deleteRecurring, toggleRecurring, generateMonth } = useRecurring();
  const [showForm, setShowForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleCreate = async (data: { description: string; value_brl: number; category_id: string; due_day: number }) => {
    const result = await createRecurring(data);
    if (result) {
      setShowForm(false);
      fetchRecurring();
    }
  };

  const handleToggle = async (id: string) => {
    await toggleRecurring(id);
    fetchRecurring();
  };

  const handleDelete = async (id: string) => {
    await deleteRecurring(id);
    fetchRecurring();
  };

  const handleEdit = (id: string) => {
    const item = recurring.find((r) => r.id === id);
    if (item) {
      setEditingItem(item);
      setShowForm(false);
    }
  };

  const handleUpdate = async (data: { description: string; value_brl: number; category_id: string; due_day: number }) => {
    if (!editingItem) return;
    await updateRecurring(editingItem.id, data);
    setEditingItem(null);
    fetchRecurring();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateMonth();
    setIsGenerating(false);
  };

  if (isLoading && recurring.length === 0) {
    return (
      <div>
        <Header title="Recorrentes" subtitle="Despesas fixas mensais" />
        <Spinner size="lg" className="mt-20" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Recorrentes"
        subtitle="Despesas fixas mensais"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleGenerate} isLoading={isGenerating}>
              <CalendarPlus className="w-4 h-4" /> Gerar mês atual
            </Button>
            <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingItem(null); }}>
              {showForm ? 'Cancelar' : 'Nova recorrência'}
            </Button>
          </div>
        }
      />

      {/* Creation form */}
      {showForm && !editingItem && (
        <div className="glass-card mb-6">
          <h3 className="text-base font-bold text-[#1e1b4b] dark:text-gray-100 mb-4">Nova despesa recorrente</h3>
          <RecurringForm onSubmit={handleCreate} />
        </div>
      )}

      {/* Edit form */}
      {editingItem && (
        <div className="glass-card mb-6">
          <h3 className="text-base font-bold text-[#1e1b4b] dark:text-gray-100 mb-4">Editar recorrência</h3>
          <RecurringForm
            key={editingItem.id}
            onSubmit={handleUpdate}
            onCancel={() => setEditingItem(null)}
            initialData={{
              description: editingItem.description,
              value_brl: editingItem.value_brl,
              category_id: editingItem.category_id ?? '',
              due_day: editingItem.due_day,
            }}
          />
        </div>
      )}

      {/* List */}
      {recurring.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma recorrência"
          description="Cadastre despesas fixas como aluguel, assinaturas ou contas mensais."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              Criar primeira recorrência
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {recurring.map((item) => (
            <RecurringCard
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
