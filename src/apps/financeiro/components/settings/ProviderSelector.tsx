import { Sparkles } from 'lucide-react';

interface ProviderSelectorProps {
  value: string;
  onChange: (provider: 'gemini' | 'grok') => void;
}

const providers = [
  { id: 'gemini' as const, name: 'Gemini 2.0 Flash', description: 'Google AI - Rapido e preciso' },
  { id: 'grok' as const, name: 'Grok 3 Fast', description: 'xAI - Rapido e economico' },
];

export default function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#7c7caa] uppercase tracking-wider block mb-3">
        Provedor de IA preferido
      </label>
      <div className="grid grid-cols-2 gap-3">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`glass-card p-4 text-left transition-all ${
              value === p.id
                ? 'ring-2 ring-indigo-500 bg-white/65 shadow-lg shadow-indigo-500/10'
                : 'hover:bg-white/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className={`w-4 h-4 ${value === p.id ? 'text-indigo-500' : 'text-[#7c7caa]'}`} />
              <span className="text-sm font-bold text-[#1e1b4b]">{p.name}</span>
            </div>
            <p className="text-xs text-[#7c7caa]">{p.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
