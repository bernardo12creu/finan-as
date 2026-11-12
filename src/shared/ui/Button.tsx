import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-medium rounded-2xl transition-all active:scale-[0.98] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 min-h-[44px]';

  const variantClasses = {
    primary:
      'bg-[var(--primary)] text-black font-semibold hover:bg-[var(--primary-bright)] shadow-md shadow-[rgba(34,197,94,0.15)]',
    secondary:
      'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)]',
    danger:
      'bg-[var(--danger)] text-white font-semibold hover:opacity-90',
    ghost:
      'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]',
  }[variant];

  const sizeClasses = {
    sm: 'text-xs px-3 py-2 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 min-h-[44px]',
    lg: 'text-base px-6 py-3.5 min-h-[50px] font-semibold',
  }[size];

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};
