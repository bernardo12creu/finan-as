import React from 'react';

export interface ProgressRingProps {
  radius?: number;
  strokeWidth?: number;
  percentage: number;
  color?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  radius = 24,
  strokeWidth = 4,
  percentage,
  color,
  children,
}) => {
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clamped = Math.min(Math.max(0, percentage), 100);
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const ringColor =
    color ||
    (clamped >= 100
      ? 'var(--danger)'
      : clamped >= 80
        ? 'var(--warning)'
        : 'var(--primary)');

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="-rotate-90 transform"
      >
        <circle
          stroke="var(--surface-2)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={ringColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
};
