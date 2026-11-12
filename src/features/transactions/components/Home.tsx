import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CalendarCheck2,
  Cloud,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { IosInstallBanner } from '@/shared/ui/IosInstallBanner';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { ProgressRing } from '@/shared/ui/ProgressRing';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { formatCentsToBRL } from '@/shared/lib/money';
import {
  getCurrentCompetence,
  formatCompetenceLabel,
  getPreviousCompetence,
  getNextCompetence,
} from '@/shared/lib/dates';
import { calculateBudgetStatus } from '@/shared/lib/budgetStatus';
import {
  useTransactions,
  useCategories,
  useBudgets,
  useUpcomingPlanned,
} from '@/data/hooks';
import { transactionRepository, recurringRepository } from '@/data/repositories/local/localRepository';
import { useTransactionModalStore } from '../transactionModalStore';
import { TransactionItem } from './TransactionItem';
import { showToast } from '@/shared/ui/toastStore';
import { useSessionStore } from '@/data/session';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { openEdit, openCreate } = useTransactionModalStore();
  const { displayName, userEmail } = useSessionStore();
  const [competence, setCompetence] = useState<string>(getCurrentCompetence());

  const userInitial = (displayName || userEmail || 'F').trim().charAt(0).toUpperCase();

  // Ensure recurring planned items exist for this competence
  React.useEffect(() => {
    recurringRepository.ensurePlannedForCompetence(competence);
  }, [competence]);

  // Data queries
  const { transactions } = useTransactions({ competence });
  const prevCompetence = getPreviousCompetence(competence);
  const { transactions: prevTransactions } = useTransactions({ competence: prevCompetence });
  const { categories } = useCategories();
  const { budgets } = useBudgets(competence);
  const { upcoming } = useUpcomingPlanned(7);

  // Aggregations
  const {
    totalExpensesCents,
    totalIncomesCents,
    balanceCents,
    categorySpending,
  } = useMemo(() => {
    let expenses = 0;
    let incomes = 0;
    const catMap = new Map<string, number>();

    transactions.forEach((tx) => {
      if (tx.type === 'expense') {
        expenses += tx.amountCents;
        catMap.set(tx.categoryId, (catMap.get(tx.categoryId) || 0) + tx.amountCents);
      } else {
        incomes += tx.amountCents;
      }
    });

    return {
      totalExpensesCents: expenses,
      totalIncomesCents: incomes,
      balanceCents: incomes - expenses,
      categorySpending: catMap,
    };
  }, [transactions]);

  // Previous month total expenses for comparison
  const prevExpensesCents = useMemo(() => {
    return prevTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amountCents, 0);
  }, [prevTransactions]);

  const monthlyVariation = useMemo(() => {
    if (prevExpensesCents === 0) return null;
    const diff = totalExpensesCents - prevExpensesCents;
    const percent = Math.round((diff / prevExpensesCents) * 100);
    return { diff, percent };
  }, [totalExpensesCents, prevExpensesCents]);

  // Total budget calculation
  const totalBudgetObj = budgets.find((b) => b.categoryId === null);
  const totalBudgetLimit = totalBudgetObj?.limitCents || 0;
  const budgetStatus = calculateBudgetStatus(totalExpensesCents, totalBudgetLimit);

  // Top spending categories with budgets
  const topCategories = useMemo(() => {
    const list = categories.filter((c) => c.type === 'expense').map((cat) => {
      const spent = categorySpending.get(cat.id) || 0;
      const budget = budgets.find((b) => b.categoryId === cat.id)?.limitCents || 0;
      const status = calculateBudgetStatus(spent, budget);
      return {
        category: cat,
        spent,
        budget,
        status,
      };
    });

    // Sort by highest spent first
    return list.sort((a, b) => b.spent - a.spent);
  }, [categories, categorySpending, budgets]);

  const recentTransactions = transactions.slice(0, 5);

  const handleConfirmPlanned = async (txId: string) => {
    await transactionRepository.update(txId, { status: 'confirmed' });
    showToast({ message: 'Lançamento confirmado!', type: 'success' });
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      {/* Native iOS Dynamic Island-aligned Header with Month Pill */}
      <MobileHeader>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/ajustes')}
            className="w-9 h-9 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary-bright)] text-xs font-extrabold flex items-center justify-center active:scale-90 transition-transform shrink-0"
            aria-label="Conta e ajustes"
          >
            {userInitial}
          </button>

          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-1 py-0.5">
            <button
              type="button"
              onClick={() => setCompetence(getPreviousCompetence(competence))}
              className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full hover:bg-white/[0.08] active:scale-90 transition-all flex items-center justify-center"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h1 className="text-[13px] font-bold text-[var(--text)] tracking-tight px-2 whitespace-nowrap">
              {formatCompetenceLabel(competence)}
            </h1>

            <button
              type="button"
              onClick={() => setCompetence(getNextCompetence(competence))}
              className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full hover:bg-white/[0.08] active:scale-90 transition-all flex items-center justify-center"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div
            className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[var(--primary)] shrink-0"
            title="Sincronizado na nuvem"
          >
            <Cloud className="w-4 h-4" />
          </div>
        </div>
      </MobileHeader>

      <IosInstallBanner />

      {/* Main Balance & Overview Card with subtle gradient fade */}
      <Card variant="fade" className="p-5 border-[var(--border)] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 gradient-fade pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Saldo do Mês
            </span>
            {monthlyVariation ? (
              <span
                className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                  monthlyVariation.percent <= 0
                    ? 'bg-[var(--primary)]/15 text-[var(--primary-bright)]'
                    : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                }`}
              >
                {monthlyVariation.percent <= 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                {Math.abs(monthlyVariation.percent)}% vs mês ant.
              </span>
            ) : null}
          </div>

          <div className="text-3xl font-extrabold tabular-nums tracking-tight">
            {formatCentsToBRL(balanceCents)}
          </div>

          {/* Income vs Expenses pills */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col p-3 rounded-2xl bg-[var(--surface-2)]/80 border border-[var(--border)]/60">
              <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                Receitas
              </span>
              <span className="text-base font-bold text-[var(--primary-bright)] tabular-nums mt-0.5">
                {formatCentsToBRL(totalIncomesCents)}
              </span>
            </div>

            <div className="flex flex-col p-3 rounded-2xl bg-[var(--surface-2)]/80 border border-[var(--border)]/60">
              <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
                Despesas
              </span>
              <span className="text-base font-bold text-[var(--text)] tabular-nums mt-0.5">
                {formatCentsToBRL(totalExpensesCents)}
              </span>
            </div>
          </div>

          {/* Total Budget Progress */}
          {totalBudgetLimit > 0 ? (
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium text-[var(--text-muted)]">
                <span>Orçamento Total</span>
                <span className="tabular-nums">
                  {formatCentsToBRL(totalExpensesCents)} de {formatCentsToBRL(totalBudgetLimit)}
                </span>
              </div>
              <ProgressBar percentage={budgetStatus.percentage} color={budgetStatus.colorClass} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/orcamentos')}
              className="text-xs text-[var(--primary-bright)] font-medium hover:underline text-left mt-1"
            >
              + Definir meta de orçamento para o mês
            </button>
          )}
        </div>
      </Card>

      {/* Monthly Closing Wrapped Banner */}
      <div
        onClick={() => navigate(`/fechamento/${competence}`)}
        className="flex items-center justify-between p-4 rounded-3xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--primary)]/50 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Fechamento do Mês</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Veja o resumo consolidado e exporte relatórios
            </p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-[var(--text-muted)]" />
      </div>

      {/* Category Progress Carousel */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
            Categorias em Foco
          </h2>
          <button
            type="button"
            onClick={() => navigate('/orcamentos')}
            className="text-xs text-[var(--primary-bright)] font-semibold"
          >
            Ajustar limites
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar touch-pan-x overscroll-x-contain -mx-4 px-4">
          {topCategories.map(({ category, spent, budget, status }) => (
            <div
              key={category.id}
              className="flex flex-col items-center justify-between p-3.5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] min-w-[130px] shrink-0 min-h-[140px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-[var(--text)] truncate max-w-[80px]">
                  {category.name}
                </span>
                <ProgressRing
                  radius={16}
                  strokeWidth={3}
                  percentage={budget > 0 ? status.percentage : 0}
                  color={status.colorClass}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    <CategoryIcon name={category.icon} className="w-2.5 h-2.5" />
                  </div>
                </ProgressRing>
              </div>

              <div className="w-full flex flex-col text-left mt-3">
                <span className="text-xs font-extrabold tabular-nums text-[var(--text)]">
                  {formatCentsToBRL(spent)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {budget > 0 ? `de ${formatCentsToBRL(budget)}` : 'Sem limite'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Planned Bills in Next 7 Days */}
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text)] tracking-tight flex items-center gap-1.5">
              <CalendarCheck2 className="w-4 h-4 text-[var(--warning)]" />
              Previsões dos Próximos 7 Dias
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {upcoming.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat?.color || '#262626' }}
                    >
                      <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text)] truncate">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {tx.date} • {formatCentsToBRL(tx.amountCents)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConfirmPlanned(tx.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-[var(--primary)] text-black rounded-lg active:scale-95 transition-transform"
                  >
                    Confirmar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
            Últimos Lançamentos
          </h2>
          <button
            type="button"
            onClick={() => navigate('/lancamentos')}
            className="text-xs text-[var(--primary-bright)] font-semibold"
          >
            Ver todos
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento no mês"
            description="Toque no botão + abaixo para registrar seu primeiro gasto ou receita."
            actionLabel="Adicionar lançamento"
            onAction={() => openCreate('expense')}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                category={categories.find((c) => c.id === tx.categoryId)}
                onClick={() => openEdit(tx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
