import { Account, Transaction } from '@/data/db';
import { calculateCardInvoiceCompetence } from './competence';

export interface AccountBalanceBreakdown {
  incomesCents: number;
  accountExpensesCents: number;
  creditExpensesCents: number;
  totalExpensesCents: number;
  accountBalanceCents: number;
}

export interface CardLimitSummary {
  limitCents: number;
  currentInvoiceCents: number;
  futureInstallmentsCents: number;
  usedLimitCents: number;
  availableLimitCents: number;
  exceededLimitCents: number;
  usagePercentage: number;
  debitMonthCents: number;
}

/**
 * Splits expenses into account cash outflow (Debit/PIX/Cash/Boleto/Transfer) vs Credit Card.
 * Credit transactions do NOT deduct from the checking/account balance; only debit-like outflows do.
 */
export function calculateAccountBalance(transactions: Transaction[]): AccountBalanceBreakdown {
  let incomesCents = 0;
  let accountExpensesCents = 0;
  let creditExpensesCents = 0;

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    if (tx.type === 'income') {
      incomesCents += tx.amountCents;
    } else if (tx.paymentMethod === 'credit') {
      creditExpensesCents += tx.amountCents;
    } else {
      accountExpensesCents += tx.amountCents;
    }
  }

  return {
    incomesCents,
    accountExpensesCents,
    creditExpensesCents,
    totalExpensesCents: accountExpensesCents + creditExpensesCents,
    accountBalanceCents: incomesCents - accountExpensesCents,
  };
}

/**
 * Calculates credit card limit consumption and current invoice strictly from `paymentMethod === 'credit'` expenses.
 * Debit/PIX/Cash transactions on the same account (e.g. Sicredi Gold) do NOT consume credit limit.
 */
export function calculateCardLimitSummary(
  account: Pick<Account, 'id' | 'closingDay' | 'creditLimitCents'>,
  allTransactions: Transaction[],
  currentCompetence: string
): CardLimitSummary {
  let currentInvoiceCents = 0;
  let futureInstallmentsCents = 0;
  let debitMonthCents = 0;

  for (const tx of allTransactions) {
    if (tx.deletedAt) continue;
    if (tx.accountId !== account.id || tx.type !== 'expense') continue;

    const comp =
      tx.competence ||
      (account.closingDay
        ? calculateCardInvoiceCompetence(tx.date, account.closingDay)
        : tx.date.substring(0, 7));

    if (tx.paymentMethod === 'credit') {
      if (comp === currentCompetence) {
        currentInvoiceCents += tx.amountCents;
      } else if (comp > currentCompetence) {
        futureInstallmentsCents += tx.amountCents;
      }
    } else if (comp === currentCompetence) {
      debitMonthCents += tx.amountCents;
    }
  }

  const usedLimitCents = currentInvoiceCents + futureInstallmentsCents;
  const limitCents = account.creditLimitCents ?? 0;
  const availableLimitCents = limitCents > 0 ? Math.max(0, limitCents - usedLimitCents) : 0;
  const exceededLimitCents =
    limitCents > 0 && usedLimitCents > limitCents ? usedLimitCents - limitCents : 0;
  const usagePercentage =
    limitCents > 0 ? Math.min(100, Math.round((usedLimitCents / limitCents) * 100)) : 0;

  return {
    limitCents,
    currentInvoiceCents,
    futureInstallmentsCents,
    usedLimitCents,
    availableLimitCents,
    exceededLimitCents,
    usagePercentage,
    debitMonthCents,
  };
}

/**
 * Identifies credit cards or dual debit/credit accounts (such as Sicredi Gold)
 * where the user should explicitly pick between Debit (account balance) and Credit (card limit).
 */
export function isCardOrDualAccount(account: Pick<Account, 'name' | 'kind'> | undefined): boolean {
  if (!account) return false;
  if (account.kind === 'credit_card') return true;
  const nameLower = account.name.toLowerCase();
  return (
    nameLower.includes('sicredi') ||
    nameLower.includes('cartão') ||
    nameLower.includes('cartao')
  );
}
