import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Trophy,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  PieChart as PieIcon,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { formatCentsToBRL } from '@/shared/lib/money';
import {
  formatCompetenceLabel,
  getPreviousCompetence,
  getCurrentCompetence,
} from '@/shared/lib/dates';
import { calculateBudgetStatus } from '@/shared/lib/budgetStatus';
import {
  useTransactions,
  useCategories,
  useBudgets,
  useAccounts,
} from '@/data/hooks';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '@/shared/lib/export';
import { showToast } from '@/shared/ui/toastStore';

export const ClosingView: React.FC = () => {
  const { competencia: paramCompetence } = useParams<{ competencia: string }>();
  const navigate = useNavigate();

  const competence = paramCompetence || getCurrentCompetence();
  const prevCompetence = getPreviousCompetence(competence);

  const { transactions } = useTransactions({ competence });
  const { transactions: prevTransactions } = useTransactions({ competence: prevCompetence });
  const { categories } = useCategories();
  const { budgets } = useBudgets(competence);
  const { accounts } = useAccounts();

  // Statistics
  const {
    totalExpensesCents,
    savingsCents,
    topCategory,
    topSingleExpense,
    budgetStats,
  } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    const catMap = new Map<string, number>();
    let maxExpense = null as (typeof transactions)[0] | null;

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        exp += t.amountCents;
        catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amountCents);
        if (!maxExpense || t.amountCents > maxExpense.amountCents) {
          maxExpense = t;
        }
      } else {
        inc += t.amountCents;
      }
    });

    // Top Category
    let topCatId = '';
    let topCatSpent = 0;
    catMap.forEach((amount, cId) => {
      if (amount > topCatSpent) {
        topCatSpent = amount;
        topCatId = cId;
      }
    });

    const topCatObj = categories.find((c) => c.id === topCatId);
    const topCatPercent = exp > 0 ? Math.round((topCatSpent / exp) * 100) : 0;

    // Budget status stats
    let fulfilled = 0;
    let exceeded = 0;
    budgets.forEach((b) => {
      if (b.categoryId) {
        const spent = catMap.get(b.categoryId) || 0;
        const status = calculateBudgetStatus(spent, b.limitCents);
        if (status.status === 'danger') exceeded++;
        else fulfilled++;
      }
    });

    return {
      totalExpensesCents: exp,
      totalIncomesCents: inc,
      savingsCents: inc - exp,
      topCategory: topCatObj ? { category: topCatObj, spent: topCatSpent, percent: topCatPercent } : null,
      topSingleExpense: maxExpense,
      budgetStats: { fulfilled, exceeded },
    };
  }, [transactions, categories, budgets]);

  // Previous month comparison
  const prevTotalExpensesCents = useMemo(() => {
    return prevTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amountCents, 0);
  }, [prevTransactions]);

  const diffExpenses = totalExpensesCents - prevTotalExpensesCents;
  const percentDiff =
    prevTotalExpensesCents > 0
      ? Math.round((diffExpenses / prevTotalExpensesCents) * 100)
      : 0;

  const handleExportExcel = () => {
    exportTransactionsToExcel(
      transactions,
      categories,
      accounts,
      `fecho_${competence}.xlsx`
    );
    showToast({ message: 'Planilha Excel gerada!', type: 'success' });
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(
      transactions,
      categories,
      accounts,
      `fecho_${competence}.csv`
    );
    showToast({ message: 'Arquivo CSV gerado!', type: 'success' });
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-12">
      {/* Top Navigation (Safe for iPhone 16 Dynamic Island) */}
      <MobileHeader>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--surface)] active:scale-90 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              Fechamento Financeiro
            </span>
            <h1 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              {formatCompetenceLabel(competence)}
            </h1>
          </div>
        </div>
      </MobileHeader>

      {/* Hero Wrapped Highlight Card */}
      <Card variant="fade" className="p-6 border-[var(--primary)]/30 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 gradient-fade pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/20 text-[var(--primary-bright)] flex items-center justify-center mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Total Desembolsado
          </span>
          <div className="text-4xl font-black tabular-nums tracking-tight text-[var(--text)]">
            {formatCentsToBRL(totalExpensesCents)}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
            {savingsCents >= 0
              ? `Você encerrou o mês no azul com sobra de ${formatCentsToBRL(savingsCents)}!`
              : `Você gastou ${formatCentsToBRL(Math.abs(savingsCents))} a mais do que recebeu este mês.`}
          </p>
        </div>
      </Card>

      {/* Grid of Wrapped Highlights */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top Category Card */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-semibold">
            <PieIcon className="w-4 h-4 text-[var(--primary)]" />
            Maior Peso
          </div>
          {topCategory ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: topCategory.category.color }}
                >
                  <CategoryIcon name={topCategory.category.icon} className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-bold truncate text-[var(--text)]">
                  {topCategory.category.name}
                </span>
              </div>
              <div className="text-xs font-bold tabular-nums text-[var(--text)]">
                {formatCentsToBRL(topCategory.spent)}
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">
                {topCategory.percent}% do total gasto
              </span>
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)] mt-2">Sem gastos</span>
          )}
        </Card>

        {/* Comparison vs Previous Month */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-semibold">
            {diffExpenses <= 0 ? (
              <TrendingDown className="w-4 h-4 text-[var(--primary)]" />
            ) : (
              <TrendingUp className="w-4 h-4 text-[var(--danger)]" />
            )}
            vs Mês Anterior
          </div>
          <div className="mt-3">
            <div
              className={`text-xl font-extrabold tabular-nums ${
                diffExpenses <= 0 ? 'text-[var(--primary-bright)]' : 'text-[var(--danger)]'
              }`}
            >
              {diffExpenses <= 0 ? '-' : '+'}
              {Math.abs(percentDiff)}%
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              {diffExpenses <= 0
                ? `Economia de ${formatCentsToBRL(Math.abs(diffExpenses))}`
                : `Aumento de ${formatCentsToBRL(diffExpenses)}`}
            </span>
          </div>
        </Card>

        {/* Budgets Performance */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-semibold">
            <CheckCircle className="w-4 h-4 text-[var(--primary)]" />
            Orçamentos
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-[var(--text)]">
              {budgetStats.fulfilled} cumpridos
            </div>
            {budgetStats.exceeded > 0 && (
              <span className="text-[10px] text-[var(--danger)] flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                {budgetStats.exceeded} estourados
              </span>
            )}
          </div>
        </Card>

        {/* Biggest Single Purchase */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-semibold">
            <Trophy className="w-4 h-4 text-[var(--warning)]" />
            Maior Compra
          </div>
          {topSingleExpense ? (
            <div className="mt-3">
              <span className="text-xs font-bold text-[var(--text)] truncate block">
                {topSingleExpense.description}
              </span>
              <div className="text-sm font-extrabold tabular-nums text-[var(--text)] mt-0.5">
                {formatCentsToBRL(topSingleExpense.amountCents)}
              </div>
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)] mt-2">Nenhuma</span>
          )}
        </Card>
      </div>

      {/* Export Actions Section */}
      <div className="flex flex-col gap-3 pt-2">
        <h2 className="text-sm font-bold text-[var(--text)]">Exportar Dados do Mês</h2>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="md" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2 text-[var(--primary)]" />
            Planilha Excel
          </Button>

          <Button variant="secondary" size="md" onClick={handleExportCSV}>
            <FileText className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
            Arquivo CSV
          </Button>
        </div>
      </div>
    </div>
  );
};
