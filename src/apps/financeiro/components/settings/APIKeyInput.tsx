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
        <label className="text-xs font-semibold text-[#7c7caa] uppercase tracking-wider">{label}</label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Cole sua API key ${provider} aqui`}
            className="flex-1 bg-white/55 backdrop-blur-lg border border-white/70 rounded-[14px] px-4 py-2.5 text-sm text-[#1e1b4b] font-medium placeholder:text-[#7c7caa]/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button onClick={() => setShowKey(!showKey)} className="p-2.5 bg-white/40 rounded-xl hover:bg-white/60 transition-colors">
            {showKey ? <EyeOff className="w-4 h-4 text-[#7c7caa]" /> : <Eye className="w-4 h-4 text-[#7c7caa]" />}
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
        <div className="text-xs font-semibold text-[#7c7caa] uppercase tracking-wider mb-1">{label}</div>
        <div className="text-sm text-[#1e1b4b] font-medium">
          {hasKey ? '••••••••••••••••' : 'Nao configurada'}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
        {hasKey ? 'Alterar' : 'Configurar'}
      </Button>
    </div>
  );
}
