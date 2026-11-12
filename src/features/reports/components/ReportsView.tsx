import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { formatCentsToBRL, centsToDecimal } from '@/shared/lib/money';
import {
  getCurrentCompetence,
  formatCompetenceLabel,
  formatShortCompetence,
  getPreviousCompetence,
  getNextCompetence,
  getLastNCompetences,
} from '@/shared/lib/dates';
import { useCategories, useTransactions } from '@/data/hooks';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { getDaysInMonth, getDate } from 'date-fns';

export const ReportsView: React.FC = () => {
  const [competence, setCompetence] = useState<string>(getCurrentCompetence());
  const { categories } = useCategories();
  const { transactions } = useTransactions();

  // Current competence transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.competence === competence && t.type === 'expense');
  }, [transactions, competence]);

  // Total spent in this competence
  const totalSpentCents = useMemo(() => {
    return monthTransactions.reduce((acc, t) => acc + t.amountCents, 0);
  }, [monthTransactions]);

  // Breakdown by Category for Donut Chart
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions.forEach((t) => {
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amountCents);
    });

    return Array.from(map.entries())
      .map(([catId, amountCents]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Outros',
          value: centsToDecimal(amountCents),
          amountCents,
          color: cat?.color || '#3B82F6',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions, categories]);

  // Top 5 Expenses
  const topExpenses = useMemo(() => {
    return [...monthTransactions]
      .sort((a, b) => b.amountCents - a.amountCents)
      .slice(0, 5);
  }, [monthTransactions]);

  // Last 6 months bar chart data
  const last6Competences = useMemo(() => getLastNCompetences(competence, 6), [competence]);

  const barChartData = useMemo(() => {
    return last6Competences.map((comp) => {
      const expenses = transactions
        .filter((t) => t.competence === comp && t.type === 'expense')
        .reduce((sum, t) => sum + t.amountCents, 0);

      const incomes = transactions
        .filter((t) => t.competence === comp && t.type === 'income')
        .reduce((sum, t) => sum + t.amountCents, 0);

      return {
        competence: formatShortCompetence(comp),
        despesas: centsToDecimal(expenses),
        receitas: centsToDecimal(incomes),
      };
    });
  }, [last6Competences, transactions]);

  // Daily average and end of month projection
  const { dailyAverageCents, projectedTotalCents, daysRemaining } = useMemo(() => {
    const [year, month] = competence.split('-').map(Number);
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() + 1 === month;

    const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
    const passedDays = isCurrentMonth ? Math.max(1, getDate(today)) : totalDaysInMonth;
    const remaining = isCurrentMonth ? Math.max(0, totalDaysInMonth - passedDays) : 0;

    // Confirmed spending so far
    const confirmedSpentCents = monthTransactions
      .filter((t) => t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amountCents, 0);

    const plannedPendingCents = monthTransactions
      .filter((t) => t.status === 'planned')
      .reduce((sum, t) => sum + t.amountCents, 0);

    const dailyAvg = Math.round(confirmedSpentCents / passedDays);
    const projected = confirmedSpentCents + dailyAvg * remaining + plannedPendingCents;

    return {
      dailyAverageCents: dailyAvg,
      projectedTotalCents: projected,
      daysRemaining: remaining,
    };
  }, [competence, monthTransactions]);

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      {/* Native iOS Dynamic Island-aligned Header with Month Pill */}
      <MobileHeader>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-[var(--text)] tracking-tight">Relatórios</h1>

          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-1 py-0.5">
            <button
              type="button"
              onClick={() => setCompetence(getPreviousCompetence(competence))}
              className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full hover:bg-white/[0.08] active:scale-90 transition-all flex items-center justify-center"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-[12px] font-bold text-[var(--text)] tracking-tight px-1.5 whitespace-nowrap">
              {formatCompetenceLabel(competence)}
            </span>

            <button
              type="button"
              onClick={() => setCompetence(getNextCompetence(competence))}
              className="w-8 h-8 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full hover:bg-white/[0.08] active:scale-90 transition-all flex items-center justify-center"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </MobileHeader>

      {/* Projection & Daily Average Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Média Diária</span>
          <div className="text-lg font-extrabold tabular-nums text-[var(--text)] mt-1">
            {formatCentsToBRL(dailyAverageCents)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">por dia transcorrido</span>
        </Card>

        <Card className="p-4 flex flex-col justify-between border-[var(--primary)]/30">
          <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
            Projeção Final
          </span>
          <div className="text-lg font-extrabold tabular-nums text-[var(--primary-bright)] mt-1">
            {formatCentsToBRL(projectedTotalCents)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1">
            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Mês encerrado'}
          </span>
        </Card>
      </div>

      {/* Donut Chart by Category */}
      <Card className="p-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-[var(--text)]">Despesas por Categoria</h2>

        {pieData.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            Sem despesas registradas nesta competência.
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-full h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} stroke="var(--bg)" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">Total</span>
                <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                  {formatCentsToBRL(totalSpentCents)}
                </span>
              </div>
            </div>

            {/* Category breakdown pills */}
            <div className="w-full flex flex-col gap-2 mt-2">
              {pieData.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[var(--text)] font-medium">{item.name}</span>
                  </div>
                  <span className="tabular-nums font-bold text-[var(--text)]">
                    {formatCentsToBRL(item.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 6 Months Evolution Bar Chart */}
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text)]">Evolução (Últimos 6 Meses)</h2>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--danger)]" /> Despesas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" /> Receitas
            </span>
          </div>
        </div>

        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="competence" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="receitas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="var(--danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top 5 Expenses of Month */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text)]">Maiores Gastos do Mês</h2>

        {topExpenses.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] text-center">
            Nenhuma despesa para exibir.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {topExpenses.map((t, idx) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-[var(--text-muted)] w-4 text-center">
                      #{idx + 1}
                    </span>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat?.color || '#262626' }}
                    >
                      <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text)] truncate">
                        {t.description}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {cat?.name} • {t.date}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold tabular-nums text-[var(--text)]">
                    {formatCentsToBRL(t.amountCents)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
