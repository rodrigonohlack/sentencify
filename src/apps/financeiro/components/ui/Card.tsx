import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({ className = '', hover = true, children, ...props }: CardProps) {
  return (
    <div
      className={`glass-card ${hover ? '' : 'hover:bg-[rgba(255,255,255,0.55)] dark:hover:bg-[rgba(30,41,59,0.5)] hover:shadow-none'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
