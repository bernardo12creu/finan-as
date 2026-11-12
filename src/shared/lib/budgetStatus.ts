export type BudgetStatusLevel = 'normal' | 'warning' | 'danger';

export interface BudgetStatusResult {
  percentage: number; // e.g. 75, 90, 115
  status: BudgetStatusLevel;
  spentCents: number;
  limitCents: number;
  remainingCents: number; // 0 if overspent
  overspentCents: number; // 0 if within limit
  colorClass: string;
}

/**
 * Calculates budget consumption and status level:
 * - normal (<80%)
 * - warning (80–99.9%)
 * - danger (≥100%)
 */
export function calculateBudgetStatus(
  spentCents: number,
  limitCents: number
): BudgetStatusResult {
  if (limitCents <= 0) {
    return {
      percentage: spentCents > 0 ? 100 : 0,
      status: spentCents > 0 ? 'danger' : 'normal',
      spentCents,
      limitCents,
      remainingCents: 0,
      overspentCents: Math.max(0, spentCents),
      colorClass: spentCents > 0 ? 'var(--danger)' : 'var(--primary)',
    };
  }

  const percentage = Math.round((spentCents / limitCents) * 100);
  const remainingCents = Math.max(0, limitCents - spentCents);
  const overspentCents = Math.max(0, spentCents - limitCents);

  let status: BudgetStatusLevel = 'normal';
  let colorClass = 'var(--primary)';

  if (percentage >= 100) {
    status = 'danger';
    colorClass = 'var(--danger)';
  } else if (percentage >= 80) {
    status = 'warning';
    colorClass = 'var(--warning)';
  }

  return {
    percentage,
    status,
    spentCents,
    limitCents,
    remainingCents,
    overspentCents,
    colorClass,
  };
}
