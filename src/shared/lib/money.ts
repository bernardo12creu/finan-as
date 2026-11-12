/**
 * Money utilities: all monetary values are strictly represented in integer cents (BRL).
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats integer cents into standard BRL currency string (e.g. 1250 -> "R$ 12,50")
 */
export function formatCentsToBRL(cents: number): string {
  if (isNaN(cents) || !isFinite(cents)) return 'R$ 0,00';
  return brlFormatter.format(cents / 100);
}

/**
 * Formats integer cents into decimal representation string without currency symbol (e.g. 1250 -> "12,50")
 */
export function formatCentsToDecimalString(cents: number): string {
  if (isNaN(cents) || !isFinite(cents)) return '0,00';
  return decimalFormatter.format(cents / 100);
}

/**
 * Converts integer cents to a standard float decimal for export purposes (e.g. 1250 -> 12.50)
 */
export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Safely converts a float/number to integer cents (e.g. 12.50 -> 1250)
 */
export function decimalToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Parses user input or raw strings to integer cents
 */
export function parseBRLToCents(input: string): number {
  if (!input) return 0;
  // Strip everything except digits and comma/dot
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  // If contains comma as decimal separator (standard pt-BR)
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    const integerPart = parts[0].replace(/\D/g, '') || '0';
    const fractionalPart = (parts[1] || '').replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
    return parseInt(integerPart, 10) * 100 + parseInt(fractionalPart, 10);
  }

  // If only dot or plain digits
  const parts = cleaned.split('.');
  if (parts.length > 1 && parts[parts.length - 1].length <= 2) {
    const fractionalPart = parts.pop()!.padEnd(2, '0').slice(0, 2);
    const integerPart = parts.join('').replace(/\D/g, '') || '0';
    return parseInt(integerPart, 10) * 100 + parseInt(fractionalPart, 10);
  }

  const digits = cleaned.replace(/\D/g, '');
  return parseInt(digits || '0', 10) * 100;
}

/**
 * Keypad centavos-first logic:
 * typing 1 -> 1 cent (R$ 0,01)
 * typing 2 -> 12 cents (R$ 0,12)
 * typing 3 -> 123 cents (R$ 1,23)
 * typing 4 -> 1234 cents (R$ 12,34)
 * backspace ('backspace') -> drops the last digit (1234 -> 123)
 * clear ('clear') -> resets to 0
 */
export function keypadInputToCents(currentCents: number, key: string): number {
  const MAX_CENTS = 9999999999; // R$ 99.999.999,99

  if (key === 'backspace') {
    return Math.floor(Math.max(0, currentCents) / 10);
  }

  if (key === 'clear') {
    return 0;
  }

  if (/^[0-9]$/.test(key)) {
    const digit = parseInt(key, 10);
    const nextValue = Math.max(0, currentCents) * 10 + digit;
    return nextValue > MAX_CENTS ? currentCents : nextValue;
  }

  return currentCents;
}
