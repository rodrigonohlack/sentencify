import { Button, Input, Select } from '../ui';
import { CATEGORIES } from '../../constants/categories';

interface RecurringFormProps {
  onSubmit: (data: { description: string; value_brl: number; category_id: string; due_day: number }) => void;
  isLoading?: boolean;
}

export default function RecurringForm({ onSubmit, isLoading }: RecurringFormProps) {
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
    e.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input name="description" label="Descricao" placeholder="Ex: Aluguel" required />
      <div className="grid grid-cols-2 gap-4">
        <Input name="value_brl" type="number" step="0.01" label="Valor (R$)" placeholder="0.00" required />
        <Input name="due_day" type="number" min="1" max="31" label="Dia do vencimento" placeholder="1-31" required />
      </div>
      <Select name="category_id" label="Categoria" options={categoryOptions} />
      <Button type="submit" className="mt-2" isLoading={isLoading}>
        Criar recorrencia
      </Button>
    </form>
  );
}
