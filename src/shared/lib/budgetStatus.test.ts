import { describe, it, expect } from 'vitest';
import { calculateBudgetStatus } from './budgetStatus';

describe('budget status calculation', () => {
  const limitCents = 100000; // R$ 1.000,00

  it('reports normal when spent < 80%', () => {
    const res = calculateBudgetStatus(50000, limitCents); // 50%
    expect(res.status).toBe('normal');
    expect(res.percentage).toBe(50);
    expect(res.remainingCents).toBe(50000);
    expect(res.overspentCents).toBe(0);
  });

  it('reports warning (atenção) when spent is between 80% and 99%', () => {
    const res = calculateBudgetStatus(85000, limitCents); // 85%
    expect(res.status).toBe('warning');
    expect(res.percentage).toBe(85);
    expect(res.remainingCents).toBe(15000);
    expect(res.overspentCents).toBe(0);
  });

  it('reports danger (estourado) when spent is >= 100%', () => {
    const resExact = calculateBudgetStatus(100000, limitCents); // 100%
    expect(resExact.status).toBe('danger');
    expect(resExact.percentage).toBe(100);
    expect(resExact.remainingCents).toBe(0);

    const resOver = calculateBudgetStatus(120000, limitCents); // 120%
    expect(resOver.status).toBe('danger');
    expect(resOver.percentage).toBe(120);
    expect(resOver.remainingCents).toBe(0);
    expect(resOver.overspentCents).toBe(20000);
  });
});
