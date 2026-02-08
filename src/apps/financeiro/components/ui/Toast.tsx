import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-indigo-500" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass-card p-4 flex items-center gap-3 min-w-[320px] animate-slide-up shadow-lg"
        >
          {icons[toast.type]}
          <span className="text-sm font-medium text-[#1e1b4b] flex-1">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="p-1 rounded-lg hover:bg-white/40">
            <X className="w-4 h-4 text-[#7c7caa]" />
          </button>
        </div>
      ))}
    </div>
  );
}
