import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]/40 ${className}`}
      {...props}
    />
  );
};
