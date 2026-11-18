import { describe, it, expect } from 'vitest';
import { Transaction } from '@/data/db';
import {
  calculateAccountBalance,
  calculateCardLimitSummary,
  isCardOrDualAccount,
} from './cardLimit';

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'tx_' + Math.random().toString(36).slice(2, 8),
    workspaceId: 'ws_1',
    createdBy: 'u_1',
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
    type: 'expense',
    amountCents: 1000,
    description: 'Teste',
    categoryId: 'cat_1',
    accountId: 'acc_sicredi',
    paymentMethod: 'debit',
    date: '2026-11-18',
    competence: '2026-11',
    status: 'confirmed',
    tags: [],
    paidBy: 'u_1',
    visibility: 'shared',
    ...overrides,
  };
}

describe('cardLimit helpers', () => {
  it('separates credit expenses from account balance outflows', () => {
    const txs: Transaction[] = [
      makeTx({ type: 'income', amountCents: 227400, paymentMethod: 'pix', description: 'Salário' }),
      makeTx({ type: 'expense', amountCents: 83000, paymentMethod: 'pix', description: 'Moradia' }),
      makeTx({ type: 'expense', amountCents: 64105, paymentMethod: 'debit', description: 'Compras Débito' }),
      makeTx({ type: 'expense', amountCents: 13300, paymentMethod: 'credit', description: 'iPhone 1/4' }),
      makeTx({ type: 'expense', amountCents: 3789, paymentMethod: 'credit', description: 'Assinaturas' }),
    ];

    const breakdown = calculateAccountBalance(txs);

    expect(breakdown.incomesCents).toBe(227400);
    expect(breakdown.accountExpensesCents).toBe(147105);
    expect(breakdown.creditExpensesCents).toBe(17089);
    expect(breakdown.totalExpensesCents).toBe(164194);
    expect(breakdown.accountBalanceCents).toBe(227400 - 147105);
  });

  it('excludes debit and pix transactions from credit card limit and invoice', () => {
    const account = { id: 'acc_sicredi', closingDay: 27, creditLimitCents: 200000 };
    const txs: Transaction[] = [
      makeTx({ amountCents: 83000, paymentMethod: 'pix', competence: '2026-11' }),
      makeTx({ amountCents: 25000, paymentMethod: 'debit', competence: '2026-11' }),
      makeTx({ amountCents: 1390, paymentMethod: 'credit', competence: '2026-11' }),
      makeTx({ amountCents: 2399, paymentMethod: 'credit', competence: '2026-11' }),
    ];

    const summary = calculateCardLimitSummary(account, txs, '2026-11');

    expect(summary.currentInvoiceCents).toBe(3789);
    expect(summary.futureInstallmentsCents).toBe(0);
    expect(summary.usedLimitCents).toBe(3789);
    expect(summary.availableLimitCents).toBe(200000 - 3789);
    expect(summary.debitMonthCents).toBe(108000);
  });

  it('includes future credit installments in total used limit and calculates available limit', () => {
    const account = { id: 'acc_sicredi', closingDay: 27, creditLimitCents: 100000 };
    const txs: Transaction[] = [
      makeTx({ amountCents: 13300, paymentMethod: 'credit', competence: '2026-11' }),
      makeTx({ amountCents: 3789, paymentMethod: 'credit', competence: '2026-11' }),
      makeTx({ amountCents: 13300, paymentMethod: 'credit', competence: '2026-12' }),
      makeTx({ amountCents: 13300, paymentMethod: 'credit', competence: '2027-01' }),
      makeTx({ amountCents: 13300, paymentMethod: 'credit', competence: '2027-02' }),
      // Past closed month should not consume active remaining limit once competence passes
      makeTx({ amountCents: 50000, paymentMethod: 'credit', competence: '2026-10' }),
    ];

    const summary = calculateCardLimitSummary(account, txs, '2026-11');

    expect(summary.currentInvoiceCents).toBe(17089);
    expect(summary.futureInstallmentsCents).toBe(39900);
    expect(summary.usedLimitCents).toBe(56989);
    expect(summary.availableLimitCents).toBe(100000 - 56989);
    expect(summary.exceededLimitCents).toBe(0);
    expect(summary.usagePercentage).toBe(57);
  });

  it('recognizes Sicredi Gold and credit_card accounts as dual/card accounts', () => {
    expect(isCardOrDualAccount({ name: 'Sicredi Gold', kind: 'credit_card' })).toBe(true);
    expect(isCardOrDualAccount({ name: 'Sicredi Gold', kind: 'checking' })).toBe(true);
    expect(isCardOrDualAccount({ name: 'Conta Corrente', kind: 'checking' })).toBe(false);
    expect(isCardOrDualAccount(undefined)).toBe(false);
  });
});
