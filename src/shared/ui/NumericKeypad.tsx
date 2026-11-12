import React from 'react';
import { Delete } from 'lucide-react';

export interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  className?: string;
  compact?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onKeyPress,
  className = '',
  compact = false,
}) => {
  const handlePress = (key: string) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
    onKeyPress(key);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  const keyHeight = compact ? 'h-12' : 'h-[52px]';
  const gridGap = compact ? 'gap-2' : 'gap-2.5';

  return (
    <div className={`grid grid-rows-4 ${gridGap} w-full select-none touch-pan-y ${className}`}>
      {keys.map((row, rowIndex) => (
        <div key={rowIndex} className={`grid grid-cols-3 ${gridGap}`}>
          {row.map((k) => {
            if (k === 'clear') {
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePress('clear')}
                  className={`${keyHeight} rounded-2xl bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold text-sm hover:text-[var(--text)] active:bg-[var(--border)] active:scale-95 transition-transform duration-75 flex items-center justify-center min-h-[44px] touch-pan-y`}
                  aria-label="Limpar valor"
                >
                  C
                </button>
              );
            }

            if (k === 'backspace') {
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePress('backspace')}
                  className={`${keyHeight} rounded-2xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] active:bg-[var(--border)] active:scale-95 transition-transform duration-75 flex items-center justify-center min-h-[44px] touch-pan-y`}
                  aria-label="Apagar dígito"
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
            }

            return (
              <button
                key={k}
                type="button"
                onClick={() => handlePress(k)}
                className={`${keyHeight} rounded-2xl bg-[var(--surface-2)] text-[var(--text)] font-semibold text-xl tabular-nums active:bg-[var(--border)] active:scale-95 transition-transform duration-75 flex items-center justify-center min-h-[44px] touch-pan-y`}
              >
                {k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
