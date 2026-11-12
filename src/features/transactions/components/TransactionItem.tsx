import React, { useEffect, useRef } from 'react';
import { Transaction, Category } from '@/data/db';
import { formatCentsToBRL } from '@/shared/lib/money';
import { formatFriendlyDate } from '@/shared/lib/dates';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { CalendarClock, CreditCard, Trash2 } from 'lucide-react';

export interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  onClick?: () => void;
  onSelect?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  animateEnter?: boolean;
  enterDelayMs?: number;
}

export const TransactionItem: React.FC<TransactionItemProps> = React.memo(
  ({
    transaction,
    category,
    onClick,
    onSelect,
    onDelete,
    animateEnter = true,
    enterDelayMs = 0,
  }) => {
    const isExpense = transaction.type === 'expense';
    const isPlanned = transaction.status === 'planned';

    const cardRef = useRef<HTMLDivElement>(null);
    const actionRef = useRef<HTMLButtonElement>(null);
    const swipeRef = useRef<{
      tracking: boolean;
      mode: 'pending' | 'horizontal' | 'vertical';
      startX: number;
      startY: number;
      startOffset: number;
      currentX: number;
      openOffset: number;
      rafId: number | null;
      suppressClickUntil: number;
    }>({
      tracking: false,
      mode: 'pending',
      startX: 0,
      startY: 0,
      startOffset: 0,
      currentX: 0,
      openOffset: 0,
      rafId: null,
      suppressClickUntil: 0,
    });

    const onDeleteRef = useRef(onDelete);
    onDeleteRef.current = onDelete;
    const txRef = useRef(transaction);
    txRef.current = transaction;

    const paintSwipe = (x: number) => {
      if (cardRef.current) {
        cardRef.current.style.transform = x === 0 ? 'translate3d(0, 0, 0)' : `translate3d(${x.toFixed(1)}px, 0, 0)`;
      }
      if (actionRef.current) {
        const progress = Math.min(1, Math.max(0, -x / 76));
        actionRef.current.style.opacity = progress.toFixed(2);
        actionRef.current.style.transform = `scale(${(0.86 + 0.14 * progress).toFixed(3)})`;
      }
    };

    const snapCard = (targetX: number) => {
      const s = swipeRef.current;
      s.openOffset = targetX;
      s.currentX = targetX;
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
      }
      if (actionRef.current) {
        actionRef.current.style.transition = 'opacity 200ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
      }
      paintSwipe(targetX);
    };

    useEffect(() => {
      const card = cardRef.current;
      if (!card || !onDelete) return;

      const onTouchMove = (e: TouchEvent) => {
        const s = swipeRef.current;
        if (!s.tracking || s.mode === 'vertical' || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const dx = touch.clientX - s.startX;
        const dy = touch.clientY - s.startY;

        if (s.mode === 'pending') {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dx) > Math.abs(dy) * 1.35) {
            s.mode = 'horizontal';
            if (cardRef.current) cardRef.current.style.transition = 'none';
            if (actionRef.current) actionRef.current.style.transition = 'none';
          } else {
            s.mode = 'vertical';
            return;
          }
        }

        if (s.mode === 'horizontal') {
          if (e.cancelable) e.preventDefault();
          const raw = s.startOffset + dx;
          let clamped = raw;
          if (raw > 0) {
            clamped = raw * 0.16;
          } else if (raw < -96) {
            clamped = -96 + (raw + 96) * 0.35;
          }
          s.currentX = clamped;

          if (s.rafId === null) {
            s.rafId = requestAnimationFrame(() => {
              s.rafId = null;
              paintSwipe(s.currentX);
            });
          }
        }
      };

      const onTouchEnd = () => {
        const s = swipeRef.current;
        if (!s.tracking) return;
        const wasHorizontal = s.mode === 'horizontal';
        s.tracking = false;
        s.mode = 'pending';

        if (s.rafId !== null) {
          cancelAnimationFrame(s.rafId);
          s.rafId = null;
        }

        if (!wasHorizontal) return;
        s.suppressClickUntil = performance.now() + 260;

        if (s.currentX <= -132 && onDeleteRef.current) {
          snapCard(-card.offsetWidth);
          window.setTimeout(() => {
            onDeleteRef.current?.(txRef.current);
          }, 170);
        } else if (s.currentX <= -48) {
          snapCard(-82);
        } else {
          snapCard(0);
        }
      };

      card.addEventListener('touchmove', onTouchMove, { passive: false });
      card.addEventListener('touchend', onTouchEnd, { passive: true });
      card.addEventListener('touchcancel', onTouchEnd, { passive: true });

      return () => {
        card.removeEventListener('touchmove', onTouchMove);
        card.removeEventListener('touchend', onTouchEnd);
        card.removeEventListener('touchcancel', onTouchEnd);
      };
    }, [onDelete]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      if (!onDelete || e.touches.length !== 1) return;
      const touch = e.touches[0];
      swipeRef.current.tracking = true;
      swipeRef.current.mode = 'pending';
      swipeRef.current.startX = touch.clientX;
      swipeRef.current.startY = touch.clientY;
      swipeRef.current.startOffset = swipeRef.current.openOffset;
      swipeRef.current.currentX = swipeRef.current.openOffset;
    };

    const handleClick = () => {
      if (performance.now() < swipeRef.current.suppressClickUntil) return;
      if (swipeRef.current.openOffset !== 0) {
        snapCard(0);
        return;
      }
      if (onSelect) onSelect(transaction);
      else onClick?.();
    };

    return (
      <div
        className={`relative overflow-hidden rounded-2xl tx-row-perf group ${
          animateEnter ? 'ios-item-enter' : ''
        }`}
        style={
          animateEnter
            ? ({ '--enter-delay': `${enterDelayMs}ms` } as React.CSSProperties)
            : undefined
        }
      >
        {onDelete && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            <button
              ref={actionRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                snapCard(0);
                onDelete(transaction);
              }}
              style={{ opacity: 0, transform: 'scale(0.86)' }}
              className="h-[calc(100%-8px)] px-3.5 rounded-xl bg-[var(--danger)] text-white flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold active:scale-95"
              aria-label="Excluir lançamento"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>
          </div>
        )}

        <div
          ref={cardRef}
          onTouchStart={handleTouchStart}
          onClick={handleClick}
          className="relative z-10 flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] active:scale-[0.99] transition-transform duration-100 cursor-pointer min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Category Icon Badge */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: category?.color || '#262626' }}
            >
              <CategoryIcon name={category?.icon || 'Tag'} className="w-5 h-5" />
            </div>

            {/* Description & metadata */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--text)] truncate">
                  {transaction.description}
                </span>
                {isPlanned && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--warning)]/15 text-[var(--warning)] text-[10px] font-medium shrink-0">
                    <CalendarClock className="w-3 h-3" />
                    Previsto
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                <span>{category?.name || 'Geral'}</span>
                <span>•</span>
                <span>{formatFriendlyDate(transaction.date)}</span>
                {transaction.installment && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text-muted)]">
                      <CreditCard className="w-3 h-3" />
                      {transaction.installment.number}/{transaction.installment.total}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Amount Display + Desktop Hover Delete */}
          <div className="flex items-center gap-2 shrink-0 pl-2">
            <span
              className={`text-sm font-bold tabular-nums ${
                isExpense ? 'text-[var(--text)]' : 'text-[var(--primary-bright)]'
              }`}
            >
              {isExpense ? '-' : '+'}
              {formatCentsToBRL(transaction.amountCents)}
            </span>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(transaction);
                }}
                className="hidden [@media(hover:hover)]:flex p-1.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TransactionItem.displayName = 'TransactionItem';
