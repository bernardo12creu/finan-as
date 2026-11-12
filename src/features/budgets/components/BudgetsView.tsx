import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Target } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { formatCentsToBRL, keypadInputToCents } from '@/shared/lib/money';
import {
  getCurrentCompetence,
  formatCompetenceLabel,
  getPreviousCompetence,
  getNextCompetence,
} from '@/shared/lib/dates';
import { calculateBudgetStatus } from '@/shared/lib/budgetStatus';
import { useCategories, useBudgets, useTransactions } from '@/data/hooks';
import { budgetRepository } from '@/data/repositories/local/localRepository';
import { NumericKeypad } from '@/shared/ui/NumericKeypad';
import { showToast } from '@/shared/ui/toastStore';
import { Category } from '@/data/db';

export const BudgetsView: React.FC = () => {
  const navigate = useNavigate();
  const [competence, setCompetence] = useState<string>(getCurrentCompetence());
  const { categories } = useCategories('expense');
  const { budgets } = useBudgets(competence);
  const { transactions } = useTransactions({ competence, type: 'expense' });

  // Modal editing state
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null); // null means total budget
  const [editingAmountCents, setEditingAmountCents] = useState(0);

  // Spending map
  const spentByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    transactions.forEach((tx) => {
      total += tx.amountCents;
      map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amountCents);
    });
    return { map, total };
  }, [transactions]);

  const totalBudgetObj = budgets.find((b) => b.categoryId === null);
  const totalLimit = totalBudgetObj?.limitCents || 0;
  const totalStatus = calculateBudgetStatus(spentByCategory.total, totalLimit);

  const openEditor = (category: Category | null, currentLimit: number) => {
    setSelectedCat(category);
    setEditingAmountCents(currentLimit);
    setIsEditing(true);
  };

  const handleSaveBudget = async () => {
    await budgetRepository.setBudget(
      competence,
      selectedCat ? selectedCat.id : null,
      editingAmountCents
    );
    showToast({
      message: `Orçamento de ${selectedCat ? selectedCat.name : 'Total'} atualizado!`,
      type: 'success',
    });
    setIsEditing(false);
  };

  const handleCopyPrevious = async () => {
    const copiedCount = await budgetRepository.copyBudgetsFromPreviousMonth(competence);
    if (copiedCount === 0) {
      showToast({ message: 'Nenhum orçamento encontrado no mês anterior', type: 'info' });
    } else {
      showToast({ message: `${copiedCount} orçamentos copiados do mês anterior!`, type: 'success' });
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      {/* Month Selector Bar (Safe for iPhone 16 Dynamic Island) */}
      <MobileHeader>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--surface)] active:scale-90 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
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

          <div className="w-9 shrink-0" />
        </div>
      </MobileHeader>

      {/* Copy previous month button */}
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={handleCopyPrevious}>
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copiar do mês anterior
        </Button>
      </div>

      {/* Overall Budget Card */}
      <Card
        onClick={() => openEditor(null, totalLimit)}
        className="p-5 cursor-pointer hover:border-[var(--primary)]/50 transition-all flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">Orçamento Total Mensal</h2>
          </div>
          <span className="text-xs text-[var(--primary-bright)] font-semibold">Editar</span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold tabular-nums">
            {formatCentsToBRL(spentByCategory.total)}
          </span>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            meta: {totalLimit > 0 ? formatCentsToBRL(totalLimit) : 'Não definida'}
          </span>
        </div>

        {totalLimit > 0 && (
          <ProgressBar percentage={totalStatus.percentage} color={totalStatus.colorClass} />
        )}
      </Card>

      {/* Category Budgets List */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Limites por Categoria
        </h2>

        <div className="flex flex-col gap-2.5">
          {categories.map((cat) => {
            const budgetObj = budgets.find((b) => b.categoryId === cat.id);
            const limit = budgetObj?.limitCents || 0;
            const spent = spentByCategory.map.get(cat.id) || 0;
            const status = calculateBudgetStatus(spent, limit);

            return (
              <div
                key={cat.id}
                onClick={() => openEditor(cat, limit)}
                className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-all cursor-pointer flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{cat.name}</span>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold tabular-nums text-[var(--text)]">
                      {formatCentsToBRL(spent)}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] tabular-nums">
                      {limit > 0 ? `de ${formatCentsToBRL(limit)}` : 'Sem limite'}
                    </div>
                  </div>
                </div>

                {limit > 0 && (
                  <ProgressBar percentage={status.percentage} color={status.colorClass} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Budget Set Sheet */}
      <Sheet
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={selectedCat ? `Limite: ${selectedCat.name}` : 'Limite Mensal Total'}
      >
        <div className="flex flex-col gap-4">
          <div className="text-center py-2">
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Novo Limite
            </span>
            <div className="text-3xl font-extrabold tabular-nums text-[var(--text)] mt-1">
              {formatCentsToBRL(editingAmountCents)}
            </div>
          </div>

          <NumericKeypad
            onKeyPress={(key) => setEditingAmountCents((prev) => keypadInputToCents(prev, key))}
          />

          <Button variant="primary" size="lg" fullWidth onClick={handleSaveBudget} className="mt-2">
            Salvar Limite
          </Button>
        </div>
      </Sheet>
    </div>
  );
};
