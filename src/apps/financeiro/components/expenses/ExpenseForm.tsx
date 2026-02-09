import { Button, Input, Select } from '../ui';
import { CATEGORIES } from '../../constants/categories';

interface ExpenseFormData {
  purchase_date: string;
  description: string;
  value_brl: number;
  category_id: string;
  notes: string;
}

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => void;
  isLoading?: boolean;
}

export default function ExpenseForm({ onSubmit, isLoading }: ExpenseFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const categoryOptions = [
    { value: '', label: 'Sem categoria' },
    ...CATEGORIES.map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      purchase_date: fd.get('purchase_date') as string,
      description: fd.get('description') as string,
      value_brl: parseFloat(fd.get('value_brl') as string),
      category_id: fd.get('category_id') as string,
      notes: fd.get('notes') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input name="purchase_date" type="date" label="Data" required defaultValue={today} />
        <Input name="value_brl" type="number" step="0.01" min="0.01" label="Valor (R$)" placeholder="0.00" required />
      </div>
      <Input name="description" label="Descrição" placeholder="Ex: Supermercado, Farmácia..." required />
      <Select name="category_id" label="Categoria" options={categoryOptions} defaultValue="" />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">
          Notas
        </label>
        <textarea
          name="notes"
          rows={2}
          placeholder="Observações opcionais..."
          className="w-full bg-white dark:bg-slate-800 border border-white/70 dark:border-white/[0.12] rounded-[14px] px-4 py-2.5 text-sm text-[#1e1b4b] dark:text-gray-100 font-medium placeholder:text-[#7c7caa]/60 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none"
        />
      </div>
      <Button type="submit" isLoading={isLoading} className="mt-2">
        Criar despesa
      </Button>
    </form>
  );
}
