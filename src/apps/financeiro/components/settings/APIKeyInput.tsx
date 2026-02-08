import { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '../ui';

interface APIKeyInputProps {
  provider: string;
  label: string;
  value: string;
  onSave: (value: string) => void;
}

export default function APIKeyInput({ provider, label, value, onSave }: APIKeyInputProps) {
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const hasKey = !!value;

  const handleSave = () => {
    onSave(inputValue);
    setEditing(false);
    setInputValue('');
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider">{label}</label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Cole sua API key ${provider} aqui`}
            className="flex-1 bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] rounded-[14px] px-4 py-2.5 text-sm text-[#1e1b4b] dark:text-gray-100 font-medium placeholder:text-[#7c7caa]/60 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button onClick={() => setShowKey(!showKey)} className="p-2.5 bg-white/40 dark:bg-white/[0.06] rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
            {showKey ? <EyeOff className="w-4 h-4 text-[#7c7caa] dark:text-gray-400" /> : <Eye className="w-4 h-4 text-[#7c7caa] dark:text-gray-400" />}
          </button>
          <Button size="sm" onClick={handleSave} disabled={!inputValue}>
            <Check className="w-4 h-4" /> Salvar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs font-semibold text-[#7c7caa] dark:text-gray-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-sm text-[#1e1b4b] dark:text-gray-100 font-medium">
          {hasKey ? '••••••••••••••••' : 'Nao configurada'}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
        {hasKey ? 'Alterar' : 'Configurar'}
      </Button>
    </div>
  );
}
