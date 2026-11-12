import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Trash2,
  Calendar,
  X,
  CreditCard,
} from 'lucide-react';
import { Chip } from '@/shared/ui/Chip';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatCentsToBRL } from '@/shared/lib/money';
import { formatFriendlyDate } from '@/shared/lib/dates';
import { useTransactions, useCategories } from '@/data/hooks';
import { transactionRepository } from '@/data/repositories/local/localRepository';
import { useTransactionModalStore } from '../transactionModalStore';
import { TransactionItem } from './TransactionItem';
import { showToast } from '@/shared/ui/toastStore';
import { PaymentMethod, Transaction, TransactionType } from '@/data/db';

export const TransactionsList: React.FC = () => {
  const { openEdit, openCreate } = useTransactionModalStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | undefined>(() => {
    const param = searchParams.get('type');
    return param === 'expense' || param === 'income' ? param : undefined;
  });
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    () => searchParams.get('category') || undefined
  );
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<'confirmed' | 'planned' | undefined>();
  const [pendingDeleteInstallmentTx, setPendingDeleteInstallmentTx] = useState<Transaction | null>(null);

  useEffect(() => {
    const paramType = searchParams.get('type');
    const paramCategory = searchParams.get('category');
    if (paramType === 'expense' || paramType === 'income') {
      setSelectedType(paramType);
    }
    if (paramCategory) {
      setSelectedCategory(paramCategory);
    }
  }, [searchParams]);

  const { transactions } = useTransactions({
    search: searchTerm,
    type: selectedType,
    categoryId: selectedCategory,
    paymentMethod: selectedPayment,
    status: selectedStatus,
  });

  const { categories } = useCategories();

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Array<{
      date: string;
      items: Transaction[];
      totalExpenseCents: number;
      totalIncomeCents: number;
    }> = [];

    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      if (!map.has(tx.date)) {
        map.set(tx.date, []);
      }
      map.get(tx.date)!.push(tx);
    }

    // Sort dates descending
    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    for (const date of sortedDates) {
      const items = map.get(date)!;
      let exp = 0;
      let inc = 0;
      items.forEach((it) => {
        if (it.type === 'expense') exp += it.amountCents;
        else inc += it.amountCents;
      });
      groups.push({
        date,
        items,
        totalExpenseCents: exp,
        totalIncomeCents: inc,
      });
    }

    return groups;
  }, [transactions]);

  const executeSingleDelete = async (tx: Transaction) => {
    await transactionRepository.softDelete(tx.id);
    showToast({
      message: 'Lançamento excluído',
      type: 'info',
      action: {
        label: 'Desfazer',
        onClick: async () => {
          await transactionRepository.restore(tx.id);
          showToast({ message: 'Lançamento restaurado', type: 'success' });
        },
      },
    });
  };

  const handleDelete = async (tx: Transaction) => {
    if (tx.installment) {
      setPendingDeleteInstallmentTx(tx);
      return;
    }
    await executeSingleDelete(tx);
  };

  const hasActiveFilters = Boolean(
    searchTerm || selectedType || selectedCategory || selectedPayment || selectedStatus
  );

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType(undefined);
    setSelectedCategory(undefined);
    setSelectedPayment(undefined);
    setSelectedStatus(undefined);
    if (searchParams.toString()) {
      setSearchParams({}, { replace: true });
    }
  };

  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amountCents;
      else expense += tx.amountCents;
    }
    return { income, expense, count: transactions.length };
  }, [transactions]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* Header (Safe for iPhone 16 Dynamic Island) */}
      <MobileHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">Lançamentos</h1>
          <button
            type="button"
            onClick={() => openCreate('expense')}
            className="text-xs font-semibold text-[var(--primary-bright)] px-3.5 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] active:scale-95 min-h-[38px]"
          >
            + Novo
          </button>
        </div>
      </MobileHeader>

      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome, tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl pl-10 pr-10 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] min-h-[46px]"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] absolute right-2"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x overscroll-x-contain -mx-4 px-4">
        {hasActiveFilters && (
          <Chip onClick={clearFilters} className="bg-[var(--danger)]/20 text-[var(--danger)]">
            Limpar filtros
          </Chip>
        )}

        <Chip
          active={selectedType === 'expense'}
          onClick={() => setSelectedType(selectedType === 'expense' ? undefined : 'expense')}
        >
          Despesas
        </Chip>
        <Chip
          active={selectedType === 'income'}
          onClick={() => setSelectedType(selectedType === 'income' ? undefined : 'income')}
        >
          Receitas
        </Chip>

        <Chip
          active={selectedStatus === 'planned'}
          onClick={() => setSelectedStatus(selectedStatus === 'planned' ? undefined : 'planned')}
        >
          Previstos
        </Chip>

        <Chip
          active={selectedPayment === 'credit'}
          onClick={() => setSelectedPayment(selectedPayment === 'credit' ? undefined : 'credit')}
          icon={<CreditCard className="w-3.5 h-3.5" />}
        >
          Cartão
        </Chip>
        <Chip
          active={selectedPayment === 'pix'}
          onClick={() => setSelectedPayment(selectedPayment === 'pix' ? undefined : 'pix')}
        >
          PIX
        </Chip>

        {categories.slice(0, 5).map((cat) => (
          <Chip
            key={cat.id}
            color={cat.color}
            active={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)}
          >
            {cat.name}
          </Chip>
        ))}
      </div>

      {/* Summary Strip */}
      {filteredSummary.count > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs">
          <span className="text-[var(--text-muted)] font-medium">
            {filteredSummary.count} {filteredSummary.count === 1 ? 'registro' : 'registros'}
          </span>
          <div className="flex items-center gap-3 tabular-nums font-bold">
            {filteredSummary.income > 0 && (
              <span className="text-[var(--primary-bright)]">
                +{formatCentsToBRL(filteredSummary.income)}
              </span>
            )}
            {filteredSummary.expense > 0 && (
              <span className="text-[var(--text)]">
                -{formatCentsToBRL(filteredSummary.expense)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Grouped Transactions List */}
      {groupedTransactions.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-6 h-6" />}
          title="Nenhum lançamento encontrado"
          description={
            hasActiveFilters
              ? 'Tente ajustar ou limpar os filtros para ver outros lançamentos.'
              : 'Você ainda não possui lançamentos registrados.'
          }
          actionLabel={hasActiveFilters ? 'Limpar filtros' : 'Criar primeiro lançamento'}
          onAction={hasActiveFilters ? clearFilters : () => openCreate('expense')}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groupedTransactions.map((group) => (
            <div key={group.date} className="flex flex-col gap-2">
              {/* Day Section Header */}
              <div className="flex items-center justify-between px-1 text-xs text-[var(--text-muted)] font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatFriendlyDate(group.date)}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  {group.totalExpenseCents > 0 && (
                    <span>-{formatCentsToBRL(group.totalExpenseCents)}</span>
                  )}
                  {group.totalIncomeCents > 0 && (
                    <span className="text-[var(--primary-bright)]">
                      +{formatCentsToBRL(group.totalIncomeCents)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions of this day */}
              <div className="flex flex-col gap-2">
                {group.items.map((tx) => (
                  <div key={tx.id} className="relative group">
                    <TransactionItem
                      transaction={tx}
                      category={categories.find((c) => c.id === tx.categoryId)}
                      onClick={() => openEdit(tx)}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tx);
                      }}
                      className="hidden [@media(hover:hover)]:flex absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Native iOS-style Installment Delete Sheet */}
      <Sheet
        isOpen={Boolean(pendingDeleteInstallmentTx)}
        onClose={() => setPendingDeleteInstallmentTx(null)}
        title={
          pendingDeleteInstallmentTx?.installment
            ? `Parcela ${pendingDeleteInstallmentTx.installment.number}/${pendingDeleteInstallmentTx.installment.total}`
            : 'Excluir parcelamento'
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            Deseja excluir também as próximas parcelas desta compra?
          </p>

          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={async () => {
              if (!pendingDeleteInstallmentTx?.installment) return;
              await transactionRepository.softDeleteGroup(
                pendingDeleteInstallmentTx.installment.groupId,
                pendingDeleteInstallmentTx.installment.number
              );
              setPendingDeleteInstallmentTx(null);
              showToast({ message: 'Parcelas excluídas!', type: 'info' });
            }}
          >
            Excluir esta e as próximas
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={async () => {
              if (!pendingDeleteInstallmentTx) return;
              const target = pendingDeleteInstallmentTx;
              setPendingDeleteInstallmentTx(null);
              await executeSingleDelete(target);
            }}
          >
            Excluir apenas esta
          </Button>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => setPendingDeleteInstallmentTx(null)}
          >
            Cancelar
          </Button>
        </div>
      </Sheet>
    </div>
  );
};
