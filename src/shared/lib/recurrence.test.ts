import { describe, it, expect } from 'vitest';
import {
  isRuleActiveForCompetence,
  getRecurrenceDateForCompetence,
  RecurringRuleDefinition,
} from './recurrence';

describe('recurrence rules evaluation', () => {
  const sampleRule: RecurringRuleDefinition = {
    id: 'rule-1',
    workspaceId: 'ws-1',
    dayOfMonth: 5,
    startCompetence: '2026-08',
    endCompetence: '2026-11',
    active: true,
    templateTransaction: {
      description: 'Aluguel',
      amountCents: 150000,
      type: 'expense',
      categoryId: 'cat-moradia',
      accountId: 'acc-1',
      paymentMethod: 'pix',
      tags: ['fixo'],
      visibility: 'shared',
      paidBy: 'user-1',
    },
  };

  it('identifies competence within active range', () => {
    expect(isRuleActiveForCompetence(sampleRule, '2026-07')).toBe(false); // Before start
    expect(isRuleActiveForCompetence(sampleRule, '2026-08')).toBe(true);  // Start
    expect(isRuleActiveForCompetence(sampleRule, '2026-10')).toBe(true);  // Middle
    expect(isRuleActiveForCompetence(sampleRule, '2026-11')).toBe(true);  // End
    expect(isRuleActiveForCompetence(sampleRule, '2026-12')).toBe(false); // After end
  });

  it('rejects inactive rules', () => {
    const inactive = { ...sampleRule, active: false };
    expect(isRuleActiveForCompetence(inactive, '2026-10')).toBe(false);
  });

  it('calculates proper recurrence date in month, clamping for shorter months', () => {
    // Normal day 5
    expect(getRecurrenceDateForCompetence(5, '2026-10')).toBe('2026-10-05');
    // Day 31 in November (30 days) -> clamps to 30th
    expect(getRecurrenceDateForCompetence(31, '2026-11')).toBe('2026-11-30');
    // Day 31 in February non-leap year (2026 has 28 days) -> clamps to 28th
    expect(getRecurrenceDateForCompetence(31, '2026-02')).toBe('2026-02-28');
  });
});
