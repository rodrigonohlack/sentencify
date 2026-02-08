interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export default function Badge({ children, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-[10px] text-[11px] font-semibold backdrop-blur-sm ${className}`}
      style={color ? { background: `${color}18`, color } : undefined}
    >
      {children}
    </span>
  );
}
