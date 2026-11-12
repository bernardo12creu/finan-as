import React, { useState } from 'react';
import { Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { dismissIosInstallHint, shouldShowIosInstallHint } from '@/shared/lib/pwa';

export const IosInstallBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => shouldShowIosInstallHint());

  if (!visible) return null;

  const handleDismiss = () => {
    dismissIosInstallHint();
    setVisible(false);
  };

  return (
    <div className="relative rounded-3xl bg-[#141715] border border-[var(--primary)]/30 p-3.5 pr-9 shadow-lg">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar aviso"
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] active:scale-90 transition-transform"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[var(--primary)]/15 text-[var(--primary-bright)] flex items-center justify-center shrink-0 mt-0.5">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-[var(--text)]">
            Instale o Fechô como App no iPhone
          </span>
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            Toque em{' '}
            <span className="inline-flex items-center gap-0.5 text-[var(--text)] font-semibold">
              <Share className="w-3 h-3 inline text-[var(--primary-bright)]" /> Compartilhar
            </span>{' '}
            e depois em{' '}
            <span className="inline-flex items-center gap-0.5 text-[var(--text)] font-semibold">
              <PlusSquare className="w-3 h-3 inline text-[var(--primary-bright)]" /> Adicionar à Tela de Início
            </span>{' '}
            para abrir em tela cheia na Dynamic Island.
          </p>
        </div>
      </div>
    </div>
  );
};
