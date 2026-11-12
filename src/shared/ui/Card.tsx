import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface2' | 'interactive' | 'fade';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-3xl border border-[var(--border)] transition-colors';

  const variantClasses = {
    default: 'bg-[var(--surface)]',
    surface2: 'bg-[var(--surface-2)]',
    interactive:
      'bg-[var(--surface)] hover:bg-[var(--surface-2)] active:scale-[0.99] cursor-pointer transition-transform',
    fade: 'bg-[var(--surface)] relative overflow-hidden',
  }[variant];

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};
