export type BankId =
  | 'nubank'
  | 'itau'
  | 'inter'
  | 'bradesco'
  | 'santander'
  | 'bb'
  | 'caixa'
  | 'btg'
  | 'c6'
  | 'mercadopago'
  | 'picpay'
  | 'xp'
  | 'sicredi'
  | 'sicoob'
  | 'neon';

export interface BankPreset {
  id: BankId;
  name: string;
  shortName: string;
  bgColor: string;
  fgColor: string;
  keywords: string[];
}

export const BRAZILIAN_BANKS: BankPreset[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    shortName: 'Nu',
    bgColor: '#820AD1',
    fgColor: '#FFFFFF',
    keywords: ['nubank', 'nu bank', 'nuconta', 'ultravioleta', 'roxinho'],
  },
  {
    id: 'itau',
    name: 'Itaú',
    shortName: 'Itaú',
    bgColor: '#EC7000',
    fgColor: '#FFFFFF',
    keywords: ['itau', 'itaú', 'personnalite', 'personnalité', 'uniclass', 'iti'],
  },
  {
    id: 'inter',
    name: 'Banco Inter',
    shortName: 'Inter',
    bgColor: '#FF7A00',
    fgColor: '#FFFFFF',
    keywords: ['banco inter', 'inter'],
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    shortName: 'Brad',
    bgColor: '#CC092F',
    fgColor: '#FFFFFF',
    keywords: ['bradesco', 'next', 'prime'],
  },
  {
    id: 'santander',
    name: 'Santander',
    shortName: 'Sant',
    bgColor: '#EC0000',
    fgColor: '#FFFFFF',
    keywords: ['santander', 'way', 'sx', 'select'],
  },
  {
    id: 'bb',
    name: 'Banco do Brasil',
    shortName: 'BB',
    bgColor: '#FCEE21',
    fgColor: '#0038A8',
    keywords: ['banco do brasil', 'ourocard'],
  },
  {
    id: 'caixa',
    name: 'Caixa',
    shortName: 'CEF',
    bgColor: '#005CA9',
    fgColor: '#FFFFFF',
    keywords: ['caixa', 'cef', 'caixa economica'],
  },
  {
    id: 'btg',
    name: 'BTG Pactual',
    shortName: 'BTG',
    bgColor: '#0D1B2A',
    fgColor: '#FFFFFF',
    keywords: ['btg', 'btg pactual', 'pactual'],
  },
  {
    id: 'c6',
    name: 'C6 Bank',
    shortName: 'C6',
    bgColor: '#18181B',
    fgColor: '#FFFFFF',
    keywords: ['c6', 'c6 bank', 'carbon'],
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    shortName: 'MP',
    bgColor: '#009EE3',
    fgColor: '#FFFFFF',
    keywords: ['mercado pago', 'mercadopago', 'mercado livre'],
  },
  {
    id: 'picpay',
    name: 'PicPay',
    shortName: 'Pic',
    bgColor: '#11C76F',
    fgColor: '#FFFFFF',
    keywords: ['picpay', 'pic pay'],
  },
  {
    id: 'xp',
    name: 'XP Investimentos',
    shortName: 'XP',
    bgColor: '#111111',
    fgColor: '#FACC15',
    keywords: ['xp', 'xp investimentos', 'rico'],
  },
  {
    id: 'sicredi',
    name: 'Sicredi',
    shortName: 'Sicr',
    bgColor: '#3FA110',
    fgColor: '#FFFFFF',
    keywords: ['sicredi'],
  },
  {
    id: 'sicoob',
    name: 'Sicoob',
    shortName: 'Sico',
    bgColor: '#003641',
    fgColor: '#00AE9D',
    keywords: ['sicoob'],
  },
  {
    id: 'neon',
    name: 'Neon',
    shortName: 'Neon',
    bgColor: '#00A4FF',
    fgColor: '#FFFFFF',
    keywords: ['neon'],
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getBankById(bankId?: string | null): BankPreset | undefined {
  if (!bankId) return undefined;
  return BRAZILIAN_BANKS.find((b) => b.id === bankId);
}

export function matchBankByName(accountName: string): BankPreset | undefined {
  const normalized = normalizeText(accountName);
  if (!normalized) return undefined;

  // Whole word check for very short codes like "bb" or "xp" or "c6"
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.includes('bb')) {
    return getBankById('bb');
  }
  if (tokens.includes('xp')) {
    return getBankById('xp');
  }

  for (const bank of BRAZILIAN_BANKS) {
    for (const kw of bank.keywords) {
      const normalizedKw = normalizeText(kw);
      if (normalizedKw.length <= 3) {
        if (tokens.includes(normalizedKw)) return bank;
      } else if (normalized.includes(normalizedKw)) {
        return bank;
      }
    }
  }

  return undefined;
}
