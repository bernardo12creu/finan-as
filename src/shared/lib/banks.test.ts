import { describe, it, expect } from 'vitest';
import { matchBankByName, BRAZILIAN_BANKS } from './banks';

describe('matchBankByName', () => {
  it('matches all Brazilian bank presets by their display names', () => {
    for (const bank of BRAZILIAN_BANKS) {
      expect(matchBankByName(bank.name)?.id).toBe(bank.id);
    }
  });

  it('matches custom variations regardless of case and accents', () => {
    expect(matchBankByName('Cartão Itaú Black')?.id).toBe('itau');
    expect(matchBankByName('Nubank Ultravioleta')?.id).toBe('nubank');
    expect(matchBankByName('Conta BB')?.id).toBe('bb');
    expect(matchBankByName('Cartão XP Visa Infinite')?.id).toBe('xp');
    expect(matchBankByName('C6 Carbon')?.id).toBe('c6');
    expect(matchBankByName('Inter Black')?.id).toBe('inter');
  });

  it('returns undefined for generic or unknown names without false positives', () => {
    expect(matchBankByName('Carteira / Dinheiro')).toBeUndefined();
    expect(matchBankByName('Conta Corrente')).toBeUndefined();
    expect(matchBankByName('Reserva Pessoal')).toBeUndefined();
    expect(matchBankByName('')).toBeUndefined();
  });
});
