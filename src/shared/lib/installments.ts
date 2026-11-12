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

  if (installmentsCount <= 1) {
    return [
      {
        installmentNumber: 1,
        totalInstallments: 1,
        amountCents: totalAmountCents,
        date: firstDate,
        competence: initialCompetence,
        description: baseDescription,
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
      description: `${baseDescription} (${i}/${installmentsCount})`,
    });
  }

  return plan;
}
