import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] ${className}`}
    >
      {icon ? (
        <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--primary)] mb-4 shadow-sm">
          {icon}
        </div>
      ) : null}
      <h4 className="text-base font-semibold text-[var(--text)] mb-1">{title}</h4>
      <p className="text-sm text-[var(--text-muted)] max-w-xs mb-5">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};
