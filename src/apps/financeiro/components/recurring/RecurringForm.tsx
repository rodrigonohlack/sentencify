import { Button, Input, Select } from '../ui';
import { CATEGORIES } from '../../constants/categories';

interface RecurringFormProps {
  onSubmit: (data: { description: string; value_brl: number; category_id: string; due_day: number }) => void;
  isLoading?: boolean;
  initialData?: { description: string; value_brl: number; category_id: string; due_day: number };
  onCancel?: () => void;
}

export default function RecurringForm({ onSubmit, isLoading, initialData, onCancel }: RecurringFormProps) {
  const categoryOptions = [
    { value: '', label: 'Sem categoria' },
    ...CATEGORIES.map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      description: fd.get('description') as string,
      value_brl: parseFloat(fd.get('value_brl') as string),
      category_id: fd.get('category_id') as string,
      due_day: parseInt(fd.get('due_day') as string, 10),
    });
    if (!initialData) e.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input name="description" label="Descrição" placeholder="Ex: Aluguel" required defaultValue={initialData?.description} />
      <div className="grid grid-cols-2 gap-4">
        <Input name="value_brl" type="number" step="0.01" label="Valor (R$)" placeholder="0.00" required defaultValue={initialData?.value_brl} />
        <Input name="due_day" type="number" min="1" max="31" label="Dia do vencimento" placeholder="1-31" required defaultValue={initialData?.due_day} />
      </div>
      <Select name="category_id" label="Categoria" options={categoryOptions} defaultValue={initialData?.category_id ?? ''} />
      <div className="flex gap-2 mt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Salvar alterações' : 'Criar recorrência'}
        </Button>
      </div>
    </form>
  );
}
