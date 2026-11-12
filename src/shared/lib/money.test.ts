import { describe, it, expect } from 'vitest';
import {
  formatCentsToBRL,
  formatCentsToDecimalString,
  centsToDecimal,
  decimalToCents,
  parseBRLToCents,
  keypadInputToCents,
} from './money';

describe('money utilities', () => {
  it('formats cents to Brazilian Real (BRL)', () => {
    // Note: Intl format uses non-breaking space (char 160) between R$ and value in pt-BR
    const formatted = formatCentsToBRL(1250);
    expect(formatted.replace(/\u00a0/g, ' ')).toBe('R$ 12,50');
    expect(formatCentsToBRL(0).replace(/\u00a0/g, ' ')).toBe('R$ 0,00');
    expect(formatCentsToBRL(100000).replace(/\u00a0/g, ' ')).toBe('R$ 1.000,00');
  });

  it('formats cents to decimal string', () => {
    expect(formatCentsToDecimalString(1250)).toBe('12,50');
    expect(formatCentsToDecimalString(99)).toBe('0,99');
    expect(formatCentsToDecimalString(0)).toBe('0,00');
  });

  it('converts cents to decimal and vice-versa accurately without float drifts', () => {
    expect(centsToDecimal(1234)).toBe(12.34);
    expect(decimalToCents(12.34)).toBe(1234);
    expect(decimalToCents(19.99)).toBe(1999);
  });

  it('parses user input strings to cents', () => {
    expect(parseBRLToCents('R$ 12,50')).toBe(1250);
    expect(parseBRLToCents('12,50')).toBe(1250);
    expect(parseBRLToCents('1.250,50')).toBe(125050);
    expect(parseBRLToCents('50')).toBe(5000);
    expect(parseBRLToCents('')).toBe(0);
  });

  it('handles keypad centavos-first keystrokes', () => {
    let cents = 0;
    // Typing 1 -> 1 cent (R$ 0,01)
    cents = keypadInputToCents(cents, '1');
    expect(cents).toBe(1);

    // Typing 2 -> 12 cents (R$ 0,12)
    cents = keypadInputToCents(cents, '2');
    expect(cents).toBe(12);

    // Typing 3 -> 123 cents (R$ 1,23)
    cents = keypadInputToCents(cents, '3');
    expect(cents).toBe(123);

    // Typing 4 -> 1234 cents (R$ 12,34)
    cents = keypadInputToCents(cents, '4');
    expect(cents).toBe(1234);

    // Backspace -> drops last digit -> 123 cents (R$ 1,23)
    cents = keypadInputToCents(cents, 'backspace');
    expect(cents).toBe(123);

    // Clear -> 0
    cents = keypadInputToCents(cents, 'clear');
    expect(cents).toBe(0);
  });
});
