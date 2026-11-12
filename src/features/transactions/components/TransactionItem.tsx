import React from 'react';
import { Transaction, Category } from '@/data/db';
import { formatCentsToBRL } from '@/shared/lib/money';
import { formatFriendlyDate } from '@/shared/lib/dates';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { CalendarClock, CreditCard } from 'lucide-react';

export interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  onClick?: () => void;
  onSelect?: (transaction: Transaction) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = React.memo(
  ({ transaction, category, onClick, onSelect }) => {
    const isExpense = transaction.type === 'expense';
    const isPlanned = transaction.status === 'planned';

    const handleClick = () => {
      if (onSelect) onSelect(transaction);
      else onClick?.();
    };

    return (
      <div
        onClick={handleClick}
        className="tx-row-perf flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] active:scale-[0.99] transition-transform duration-100 cursor-pointer min-h-[56px]"
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

        {/* Amount Display */}
        <div className="text-right shrink-0 pl-2">
          <span
            className={`text-sm font-bold tabular-nums ${
              isExpense ? 'text-[var(--text)]' : 'text-[var(--primary-bright)]'
            }`}
          >
            {isExpense ? '-' : '+'}
            {formatCentsToBRL(transaction.amountCents)}
          </span>
        </div>
      </div>
    );
  }
);

TransactionItem.displayName = 'TransactionItem';
