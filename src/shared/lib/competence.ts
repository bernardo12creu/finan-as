import { format, parseISO, addMonths } from 'date-fns';

export type CompetenceMode = 'purchase_date' | 'invoice_month';

/**
 * Calculates the invoice competence (YYYY-MM) for a credit card purchase.
 * If the purchase day is strictly AFTER the card's closing day,
 * the transaction rolls over to the next month's invoice.
 *
 * Example: closingDay = 25
 * Purchase on 2026-10-24 -> '2026-10'
 * Purchase on 2026-10-25 -> '2026-10' (on closing day, included in current invoice)
 * Purchase on 2026-10-26 -> '2026-11' (after closing, rolls over to next invoice)
 */
export function calculateCardInvoiceCompetence(
  purchaseDateStr: string,
  closingDay: number
): string {
  const purchaseDate = parseISO(purchaseDateStr);
  const day = purchaseDate.getDate();

  if (day > closingDay) {
    // Falls into the following month's invoice
    const nextMonth = addMonths(purchaseDate, 1);
    return format(nextMonth, 'yyyy-MM');
  }

  return format(purchaseDate, 'yyyy-MM');
}

/**
 * Determines the competence (YYYY-MM) for a transaction based on the workspace setting.
 * In 'purchase_date' mode, it always equals the purchase date's YYYY-MM.
 * In 'invoice_month' mode, if payment is credit and closingDay is provided, it uses the invoice competence.
 */
export function determineTransactionCompetence(params: {
  date: string;
  paymentMethod: string;
  cardClosingDay?: number;
  competenceMode: CompetenceMode;
}): string {
  const { date, paymentMethod, cardClosingDay, competenceMode } = params;

  if (competenceMode === 'invoice_month' && paymentMethod === 'credit' && typeof cardClosingDay === 'number') {
    return calculateCardInvoiceCompetence(date, cardClosingDay);
  }

  // Default: competence is the purchase date's month
  const parsed = parseISO(date);
  return format(parsed, 'yyyy-MM');
}
