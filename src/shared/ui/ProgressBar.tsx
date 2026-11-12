import React from 'react';

export interface ProgressBarProps {
  percentage: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color,
  className = '',
  showLabel = false,
}) => {
  const clamped = Math.min(Math.max(0, percentage), 100);

  // Default color logic if none provided
  const barColor =
    color ||
    (clamped >= 100
      ? 'var(--danger)'
      : clamped >= 80
        ? 'var(--warning)'
        : 'var(--primary)');

  return (
    <div className={`w-full ${className}`}>
      {showLabel ? (
        <div className="flex justify-between text-xs mb-1 text-[var(--text-muted)] font-medium">
          <span>Progresso</span>
          <span>{percentage}%</span>
        </div>
      ) : null}
      <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
};
