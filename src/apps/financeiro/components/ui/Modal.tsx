import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className={`bg-white dark:bg-slate-800 rounded-[20px] border border-white/70 dark:border-white/[0.12] backdrop-blur-xl shadow-xl ${sizes[size]} w-full animate-slide-up p-0 overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/10 dark:border-indigo-400/15">
          <h3 className="text-lg font-bold text-[#1e1b4b] dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/40 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-[#7c7caa] dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
