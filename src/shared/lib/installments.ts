import { addMonths, format, parseISO } from 'date-fns';

export interface InstallmentPlanItem {
  installmentNumber: number;
  totalInstallments: number;
  amountCents: number;
  date: string; // YYYY-MM-DD
  competence: string; // YYYY-MM
  description: string;
}

/**
 * Strips any trailing "(i/n)" installment suffix so base descriptions can be
 * edited cleanly and re-applied uniformly across all installments.
 */
export function stripInstallmentSuffix(description: string): string {
  return description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
}

/**
 * Formats a clean base description with "(number/total)" when total > 1.
 */
export function formatInstallmentDescription(
  baseDescription: string,
  installmentNumber: number,
  totalInstallments: number
): string {
  const cleanBase = stripInstallmentSuffix(baseDescription);
  if (totalInstallments <= 1) return cleanBase;
  return `${cleanBase} (${installmentNumber}/${totalInstallments})`;
}

/**
 * Calculates installment amounts and dates, distributing any remainder cents
 * onto the first installment so that the sum of parts exactly equals the total.
 */
export function generateInstallmentPlan(params: {
  totalAmountCents: number;
  installmentsCount: number;
  firstDate: string; // YYYY-MM-DD
  initialCompetence: string; // YYYY-MM
  baseDescription: string;
}): InstallmentPlanItem[] {
  const {
    totalAmountCents,
    installmentsCount,
    firstDate,
    initialCompetence,
    baseDescription,
  } = params;

  const cleanBase = stripInstallmentSuffix(baseDescription);

  if (installmentsCount <= 1) {
    return [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amountCents: totalAmountCents,
        date: firstDate,
        competence: initialCompetence,
        description: cleanBase,
      },
    ];
  }

  const basePerInstallment = Math.floor(totalAmountCents / installmentsCount);
  const remainderCents = totalAmountCents - basePerInstallment * installmentsCount;

  const parsedFirstDate = parseISO(firstDate);
  const [initYear, initMonth] = initialCompetence.split('-').map(Number);

  const plan: InstallmentPlanItem[] = [];

  for (let i = 1; i <= installmentsCount; i++) {
    const isFirst = i === 1;
    const amount = isFirst ? basePerInstallment + remainderCents : basePerInstallment;

    // Date for installment i
    const itemDate = addMonths(parsedFirstDate, i - 1);
    const dateStr = format(itemDate, 'yyyy-MM-dd');

    // Competence for installment i
    const itemCompetenceDate = new Date(initYear, initMonth - 1 + (i - 1), 1);
    const competenceStr = format(itemCompetenceDate, 'yyyy-MM');

    plan.push({
      installmentNumber: i,
      totalInstallments: installmentsCount,
      amountCents: amount,
      date: dateStr,
      competence: competenceStr,
      description: formatInstallmentDescription(cleanBase, i, installmentsCount),
    });
  }

  return plan;
}
