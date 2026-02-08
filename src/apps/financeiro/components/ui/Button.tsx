import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-[14px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]',
      secondary: 'bg-white/55 dark:bg-white/[0.06] backdrop-blur-lg border border-white/70 dark:border-white/[0.12] text-[#1e1b4b] dark:text-gray-100 hover:bg-white/65 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/8',
      ghost: 'text-[#7c7caa] dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/10 hover:text-[#1e1b4b] dark:hover:text-gray-100',
      danger: 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5',
      md: 'text-sm px-5 py-2.5',
      lg: 'text-base px-7 py-3',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
