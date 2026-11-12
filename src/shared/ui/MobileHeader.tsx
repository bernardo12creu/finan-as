import React from 'react';

export interface MobileHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sticky frosted iOS-style top navigation bar that extends edge-to-edge behind
 * the iPhone 16 status bar & Dynamic Island while placing controls comfortably underneath.
 */
export const MobileHeader: React.FC<MobileHeaderProps> = ({ children, className = '' }) => {
  return (
    <header
      className={`sticky top-0 z-30 -mx-4 px-4 pt-[calc(max(env(safe-area-inset-top,0px),14px)+2px)] pb-3 ios-glass-header border-b border-white/[0.07] touch-pan-y ${className}`}
    >
      {children}
    </header>
  );
};
