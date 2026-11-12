import React from 'react';
import { Delete } from 'lucide-react';

export interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onKeyPress,
  className = '',
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

  return (
    <div className={`grid grid-rows-4 gap-2.5 w-full select-none ${className}`}>
      {keys.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-2.5">
          {row.map((k) => {
            if (k === 'clear') {
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePress('clear')}
                  className="h-14 rounded-2xl bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold text-sm hover:text-[var(--text)] active:bg-[var(--border)] active:scale-95 transition-all flex items-center justify-center min-h-[44px]"
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
                  className="h-14 rounded-2xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] active:bg-[var(--border)] active:scale-95 transition-all flex items-center justify-center min-h-[44px]"
                  aria-label="Apagar dígito"
                >
                  <Delete className="w-6 h-6" />
                </button>
              );
            }

            return (
              <button
                key={k}
                type="button"
                onClick={() => handlePress(k)}
                className="h-14 rounded-2xl bg-[var(--surface-2)] text-[var(--text)] font-semibold text-2xl tabular-nums active:bg-[var(--border)] active:scale-95 transition-all flex items-center justify-center min-h-[44px]"
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
