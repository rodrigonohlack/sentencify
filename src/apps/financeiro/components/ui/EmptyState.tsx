import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-indigo-500" />
      </div>
      <h3 className="text-lg font-bold text-[#1e1b4b] mb-2">{title}</h3>
      <p className="text-sm text-[#7c7caa] max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
