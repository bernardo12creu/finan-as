import React from 'react';
import { useToastStore } from './toastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[calc(max(env(safe-area-inset-top,0px),12px)+6px)] left-0 right-0 z-50 pointer-events-none flex flex-col items-center gap-2 px-4 max-w-md mx-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="ios-toast-enter pointer-events-auto flex items-center justify-between gap-2.5 max-w-full py-2.5 px-4 rounded-full bg-[#1C1C1F] border border-white/[0.14] shadow-[0_12px_36px_rgba(0,0,0,0.7)] text-[var(--text)] text-[13px]"
        >
          <div className="flex items-center gap-2 min-w-0">
            {t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0" />
            ) : t.type === 'info' ? (
              <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[var(--primary)] shrink-0" />
            )}
            <span className="truncate font-semibold tracking-tight">{t.message}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  removeToast(t.id);
                }}
                className="px-2.5 py-0.5 text-xs font-bold text-[var(--primary-bright)] bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 active:scale-95 rounded-full transition-transform duration-100"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
