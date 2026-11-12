export interface RecurringRuleTemplate {
  description: string;
  amountCents: number;
  type: 'expense' | 'income';
  categoryId: string;
  accountId: string;
  paymentMethod: 'pix' | 'debit' | 'credit' | 'cash' | 'boleto' | 'transfer';
  tags: string[];
  visibility: 'shared' | 'private';
  paidBy: string;
}

export interface RecurringRuleDefinition {
  id: string;
  workspaceId: string;
  templateTransaction: RecurringRuleTemplate;
  dayOfMonth: number;
  startCompetence: string; // YYYY-MM
  endCompetence?: string; // YYYY-MM
  active: boolean;
}

/**
 * Checks whether a recurring rule applies to the specified competence.
 */
export function isRuleActiveForCompetence(
  rule: RecurringRuleDefinition,
  targetCompetence: string
): boolean {
  if (!rule.active) return false;
  if (targetCompetence < rule.startCompetence) return false;
  if (rule.endCompetence && targetCompetence > rule.endCompetence) return false;
  return true;
}

/**
 * Calculates the exact date string (YYYY-MM-DD) for a recurrence in a target competence.
 * Clamps day of month to maximum days in target month (e.g. Feb 31 -> Feb 28/29).
 */
export function getRecurrenceDateForCompetence(
  dayOfMonth: number,
  targetCompetence: string
): string {
  const [year, month] = targetCompetence.split('-').map(Number);
  // Last day of this month
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(Math.max(1, dayOfMonth), lastDayOfMonth);
  const dayStr = String(clampedDay).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}
