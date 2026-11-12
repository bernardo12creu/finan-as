import { describe, it, expect } from 'vitest';
import {
  calculateCardInvoiceCompetence,
  determineTransactionCompetence,
} from './competence';

describe('competence calculation and credit card rules', () => {
  const closingDay = 25; // Invoice closes on day 25

  it('assigns current month invoice when purchase is BEFORE closing day', () => {
    // Oct 10 <= 25 -> invoice 2026-10
    const comp = calculateCardInvoiceCompetence('2026-10-10', closingDay);
    expect(comp).toBe('2026-10');
  });

  it('assigns current month invoice when purchase is ON closing day', () => {
    // Oct 25 <= 25 -> invoice 2026-10
    const comp = calculateCardInvoiceCompetence('2026-10-25', closingDay);
    expect(comp).toBe('2026-10');
  });

  it('assigns next month invoice when purchase is AFTER closing day', () => {
    // Oct 26 > 25 -> invoice 2026-11
    const comp = calculateCardInvoiceCompetence('2026-10-26', closingDay);
    expect(comp).toBe('2026-11');
  });

  it('rolls year over when purchase is in December after closing day', () => {
    // Dec 28 > 25 -> invoice 2027-01
    const comp = calculateCardInvoiceCompetence('2026-12-28', closingDay);
    expect(comp).toBe('2027-01');
  });

  it('respects purchase_date mode: always assigns purchase date month', () => {
    const comp = determineTransactionCompetence({
      date: '2026-10-28',
      paymentMethod: 'credit',
      cardClosingDay: 25,
      competenceMode: 'purchase_date',
    });
    expect(comp).toBe('2026-10');
  });

  it('respects invoice_month mode for credit card purchases', () => {
    const comp = determineTransactionCompetence({
      date: '2026-10-28',
      paymentMethod: 'credit',
      cardClosingDay: 25,
      competenceMode: 'invoice_month',
    });
    expect(comp).toBe('2026-11');
  });
});
