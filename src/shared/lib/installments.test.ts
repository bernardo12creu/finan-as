import { describe, it, expect } from 'vitest';
import { generateInstallmentPlan } from './installments';

describe('installments generation and remainder distribution', () => {
  it('generates a single item when installmentsCount is 1', () => {
    const plan = generateInstallmentPlan({
      totalAmountCents: 5000,
      installmentsCount: 1,
      firstDate: '2026-10-10',
      initialCompetence: '2026-10',
      baseDescription: 'Mouse',
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].amountCents).toBe(5000);
    expect(plan[0].description).toBe('Mouse');
  });

  it('splits evenly divisible amounts with correct description (i/n) and competences', () => {
    const plan = generateInstallmentPlan({
      totalAmountCents: 120000, // R$ 1.200,00
      installmentsCount: 3,
      firstDate: '2026-10-15',
      initialCompetence: '2026-10',
      baseDescription: 'Notebook',
    });

    expect(plan).toHaveLength(3);
    expect(plan[0]).toMatchObject({
      installmentNumber: 1,
      totalInstallments: 3,
      amountCents: 40000,
      date: '2026-10-15',
      competence: '2026-10',
      description: 'Notebook (1/3)',
    });
    expect(plan[1]).toMatchObject({
      installmentNumber: 2,
      totalInstallments: 3,
      amountCents: 40000,
      date: '2026-11-15',
      competence: '2026-11',
      description: 'Notebook (2/3)',
    });
    expect(plan[2]).toMatchObject({
      installmentNumber: 3,
      totalInstallments: 3,
      amountCents: 40000,
      date: '2026-12-15',
      competence: '2026-12',
      description: 'Notebook (3/3)',
    });

    const sum = plan.reduce((acc, p) => acc + p.amountCents, 0);
    expect(sum).toBe(120000);
  });

  it('distributes remainder cents onto the first installment', () => {
    // R$ 100,00 in 3x = 10000 cents. 10000 / 3 = 3333 with remainder 1.
    // Installment 1: 3334
    // Installment 2: 3333
    // Installment 3: 3333
    const plan = generateInstallmentPlan({
      totalAmountCents: 10000,
      installmentsCount: 3,
      firstDate: '2026-10-01',
      initialCompetence: '2026-10',
      baseDescription: 'Mercado',
    });

    expect(plan).toHaveLength(3);
    expect(plan[0].amountCents).toBe(3334);
    expect(plan[1].amountCents).toBe(3333);
    expect(plan[2].amountCents).toBe(3333);

    const sum = plan.reduce((acc, p) => acc + p.amountCents, 0);
    expect(sum).toBe(10000);
  });

  it('correctly handles 7 installments with multiple cents of remainder', () => {
    // 10000 cents / 7 = 1428 base. 1428 * 7 = 9996. Remainder = 4 cents.
    // 1st: 1428 + 4 = 1432. Others: 1428 each.
    const plan = generateInstallmentPlan({
      totalAmountCents: 10000,
      installmentsCount: 7,
      firstDate: '2026-10-05',
      initialCompetence: '2026-10',
      baseDescription: 'Curso',
    });

    expect(plan[0].amountCents).toBe(1432);
    for (let i = 1; i < 7; i++) {
      expect(plan[i].amountCents).toBe(1428);
    }
    const sum = plan.reduce((acc, p) => acc + p.amountCents, 0);
    expect(sum).toBe(10000);
  });
});
