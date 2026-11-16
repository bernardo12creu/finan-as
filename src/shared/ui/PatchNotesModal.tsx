import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Mic,
  Layers,
  Tv,
  CreditCard,
  Zap,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { SubscriptionLogo } from '@/shared/ui/SubscriptionLogo';
import { BankLogo } from '@/shared/ui/BankLogo';
import { POPULAR_SUBSCRIPTIONS } from '@/shared/lib/subscriptions';
import { BRAZILIAN_BANKS } from '@/shared/lib/banks';
import { PATCH_NOTES_MAX_DAYS, usePatchNotesModalStore } from '@/shared/lib/patchNotes';

interface PatchNoteSlide {
  id: string;
  tag: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  accentClass: string;
  icon: React.FC<{ className?: string }>;
  overlay: React.ReactNode;
}

const PREVIEW_SUBSCRIPTION_IDS = [
  'netflix',
  'spotify',
  'hbomax',
  'primevideo',
  'disneyplus',
  'youtube',
] as const;

const PREVIEW_BANK_IDS = [
  'nubank',
  'itau',
  'inter',
  'bradesco',
  'santander',
  'bb',
  'sicredi',
] as const;

export const PatchNotesModal: React.FC = () => {
  const { isOpen, shownDayNumber, close } = usePatchNotesModalStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);

  const touchRef = useRef<{
    tracking: boolean;
    mode: 'pending' | 'horizontal' | 'vertical';
    startX: number;
    startY: number;
    deltaX: number;
  }>({
    tracking: false,
    mode: 'pending',
    startX: 0,
    startY: 0,
    deltaX: 0,
  });

  const previewSubscriptions = POPULAR_SUBSCRIPTIONS.filter((sub) =>
    (PREVIEW_SUBSCRIPTION_IDS as readonly string[]).includes(sub.id)
  );
  const previewBanks = BRAZILIAN_BANKS.filter((bank) =>
    (PREVIEW_BANK_IDS as readonly string[]).includes(bank.id)
  );

  const slides: PatchNoteSlide[] = [
    {
      id: 'voice',
      tag: 'Novo',
      title: 'Lançamento por Voz ao Vivo',
      description:
        'No botão +, toque em Falar e diga um ou vários gastos de uma vez. Os cards montam ao vivo na tela e você confirma tudo com 1 toque.',
      imageSrc: '/patch-notes/slide-voice.jpg',
      imageAlt: 'Ilustração do lançamento por voz no Fechô',
      accentClass: 'bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--primary-bright)]',
      icon: Mic,
      overlay: (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[var(--primary)]/35 text-[11px] font-semibold text-white shadow-lg max-w-full">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse shrink-0" />
          <span className="truncate">Gastei 35 de Uber no Pix e 55,90 da Netflix</span>
        </div>
      ),
    },
    {
      id: 'installments',
      tag: 'Novo',
      title: 'Edição em Lote de Parcelas',
      description:
        'Parcelamentos em até 24x no cartão. Ao editar categoria, cartão, descrição ou valor de qualquer parcela, todas atualizam juntas — inclusive as concluídas.',
      imageSrc: '/patch-notes/slide-installments.jpg',
      imageAlt: 'Ilustração da atualização em lote de parcelas',
      accentClass: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
      icon: Layers,
      overlay: (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/35 text-[11px] font-semibold text-white shadow-lg">
          <Layers className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Parcela 10/24 → Todas as 24 parcelas</span>
        </div>
      ),
    },
    {
      id: 'subscriptions',
      tag: 'Novo',
      title: 'Assinaturas Populares com Logos',
      description:
        'Ao selecionar Assinaturas em um novo gasto, escolha entre 16 serviços populares com preenchimento em 1 toque e logo oficial na sua lista.',
      imageSrc: '/patch-notes/slide-logos.jpg',
      imageAlt: 'Ilustração das assinaturas populares com logos',
      accentClass: 'bg-orange-500/20 border-orange-400/40 text-orange-300',
      icon: Tv,
      overlay: (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-lg">
          {previewSubscriptions.map((sub) => (
            <SubscriptionLogo key={sub.id} subscription={sub} size="sm" />
          ))}
        </div>
      ),
    },
    {
      id: 'banks',
      tag: 'Novo',
      title: '15 Bancos em Contas e Cartões',
      description:
        'Cadastre cartões e contas escolhendo seu banco com a logo oficial, cálculo automático da fatura do mês e opção de excluir com desfazer.',
      imageSrc: '/patch-notes/slide-logos.jpg',
      imageAlt: 'Ilustração dos bancos pré-definidos',
      accentClass: 'bg-sky-500/20 border-sky-400/40 text-sky-300',
      icon: CreditCard,
      overlay: (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-lg">
          {previewBanks.map((bank) => (
            <BankLogo key={bank.id} bank={bank} size="sm" />
          ))}
        </div>
      ),
    },
    {
      id: 'performance',
      tag: 'Melhoria',
      title: 'Fluidez 60/120Hz e Nuvem Blindada',
      description:
        'Animações nativas na taxa de atualização da tela, deslize livre sobre categorias, exclusão por swipe e sincronização na nuvem que protege seus dados.',
      imageSrc: '/patch-notes/slide-performance.jpg',
      imageAlt: 'Ilustração de fluidez 120Hz e sincronização segura',
      accentClass: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
      icon: Zap,
      overlay: (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-emerald-400/35 text-[11px] font-semibold text-white shadow-lg">
          <Zap className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>120Hz ProMotion · Sync Bidirecional</span>
        </div>
      ),
    },
  ];

  // Reset slide index whenever opened
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setDragOffsetPx(0);
    }
  }, [isOpen]);

  // Keyboard navigation when open
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close, slides.length]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === slides.length - 1;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchRef.current = {
      tracking: true,
      mode: 'pending',
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      deltaX: 0,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = touchRef.current;
    if (!t.tracking || t.mode === 'vertical' || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - t.startX;
    const dy = e.touches[0].clientY - t.startY;

    if (t.mode === 'pending') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        t.mode = 'horizontal';
      } else {
        t.mode = 'vertical';
        return;
      }
    }

    if (t.mode === 'horizontal') {
      let resisted = dx;
      if ((isFirst && dx > 0) || (isLast && dx < 0)) {
        resisted = dx * 0.28;
      }
      t.deltaX = resisted;
      setDragOffsetPx(resisted);
    }
  };

  const handleTouchEnd = () => {
    const t = touchRef.current;
    if (!t.tracking) return;
    const dx = t.deltaX;
    t.tracking = false;
    t.mode = 'pending';
    t.deltaX = 0;
    setDragOffsetPx(0);

    if (dx <= -48 && activeIndex < slides.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else if (dx >= 48 && activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Novidades no Fechô"
    >
      <div className="relative w-full max-w-[360px] rounded-[28px] bg-[#141416] border border-white/[0.12] shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_40px_rgba(34,197,94,0.14)] overflow-hidden flex flex-col select-none">
        {/* Top Overlay Controls over Slide Visuals */}
        <div className="absolute top-3 left-3.5 right-3.5 z-20 flex items-center justify-between pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-[var(--primary)]/35 text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary-bright)] pointer-events-auto">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>
              Dia {shownDayNumber}/{PATCH_NOTES_MAX_DAYS} · Novidades
            </span>
          </div>

          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white/80 hover:text-white flex items-center justify-center active:scale-90 transition-transform pointer-events-auto"
            aria-label="Fechar novidades"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Carousel Viewport */}
        <div
          className="w-full overflow-hidden touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className={`flex ${dragOffsetPx === 0 ? 'transition-transform duration-300 ease-out' : ''}`}
            style={{
              transform: `translate3d(calc(-${activeIndex * 100}% + ${dragOffsetPx}px), 0, 0)`,
            }}
          >
            {slides.map((slide) => {
              const Icon = slide.icon;
              return (
                <div key={slide.id} className="w-full shrink-0 flex flex-col">
                  {/* High-Resolution Illustration Stage */}
                  <div className="relative w-full aspect-[16/10] bg-[#0B0B0E] overflow-hidden">
                    <img
                      src={slide.imageSrc}
                      alt={slide.imageAlt}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-[#141416]/25 to-black/35 pointer-events-none" />

                    {/* Live Feature UI Preview Overlay */}
                    <div className="absolute bottom-3 left-4 right-4 flex justify-center">
                      {slide.overlay}
                    </div>
                  </div>

                  {/* Slide Copy Body */}
                  <div className="px-5 pt-3 pb-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${slide.accentClass}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary-bright)] text-[10px] font-extrabold uppercase tracking-wider">
                        {slide.tag}
                      </span>
                    </div>

                    <h2 className="text-lg font-extrabold text-[var(--text)] tracking-tight leading-snug">
                      {slide.title}
                    </h2>
                    <p className="text-[13px] text-[var(--text-muted)] leading-relaxed min-h-[62px]">
                      {slide.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination Dots & Slide Counter */}
        <div className="px-5 pt-1 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides das novidades">
            {slides.map((slide, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Slide ${idx + 1}: ${slide.title}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    isCurrent
                      ? 'w-6 bg-[var(--primary)]'
                      : 'w-2 bg-white/20 hover:bg-white/35'
                  }`}
                />
              );
            })}
          </div>

          <span className="text-[11px] font-semibold text-[var(--text-muted)] tabular-nums">
            {activeIndex + 1} de {slides.length}
          </span>
        </div>

        {/* Footer Action Controls */}
        <div className="px-5 pb-5 pt-2 border-t border-white/[0.08] flex items-center gap-2.5">
          {isFirst ? (
            <button
              type="button"
              onClick={close}
              className="px-4 min-h-[46px] rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition-transform"
            >
              Pular
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1 px-4 min-h-[46px] rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              onClick={close}
              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[46px] rounded-2xl bg-[var(--primary)] text-black text-sm font-extrabold active:scale-[0.98] transition-transform shadow-sm"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Começar a usar!</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              className="flex-1 inline-flex items-center justify-center gap-1 min-h-[46px] rounded-2xl bg-[var(--primary)] text-black text-sm font-extrabold active:scale-[0.98] transition-transform shadow-sm"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
