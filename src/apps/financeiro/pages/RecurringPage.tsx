import { useEffect, useState } from 'react';
import { Repeat, CalendarPlus } from 'lucide-react';
import { useRecurringStore } from '../stores/useRecurringStore';
import { useRecurring } from '../hooks/useRecurring';
import { Button, Spinner, EmptyState } from '../components/ui';
import RecurringForm from '../components/recurring/RecurringForm';
import RecurringCard from '../components/recurring/RecurringCard';
import Header from '../components/layout/Header';

export default function RecurringPage() {
  const { recurring, isLoading } = useRecurringStore();
  const { fetchRecurring, createRecurring, deleteRecurring, toggleRecurring, generateMonth } = useRecurring();
  const [showForm, setShowForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
              <CalendarPlus className="w-4 h-4" /> Gerar mes atual
            </Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : 'Nova recorrencia'}
            </Button>
          </div>
        }
      />

      {/* Creation form */}
      {showForm && (
        <div className="glass-card mb-6">
          <h3 className="text-base font-bold text-[#1e1b4b] mb-4">Nova despesa recorrente</h3>
          <RecurringForm onSubmit={handleCreate} />
        </div>
      )}

      {/* List */}
      {recurring.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma recorrencia"
          description="Cadastre despesas fixas como aluguel, assinaturas ou contas mensais."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              Criar primeira recorrencia
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
              onEdit={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
