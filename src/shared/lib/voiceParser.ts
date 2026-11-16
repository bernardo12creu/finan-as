import { Account, Category, PaymentMethod, TransactionType } from '@/data/db';
import { SubscriptionPreset, matchSubscriptionByName } from './subscriptions';
import { matchBankByName } from './banks';

export interface ParsedVoiceTransaction {
  id: string;
  rawSegment: string;
  type: TransactionType;
  amountCents: number;
  description: string;
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
  paymentMethod: PaymentMethod;
  date: string;
  installmentsCount: number;
  matchedSubscription?: SubscriptionPreset;
}

export interface VoiceParserContext {
  categories: Category[];
  accounts: Account[];
  defaultDate: string;
  defaultType: TransactionType;
  defaultPaymentMethod: PaymentMethod;
  defaultAccountId: string;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const HUNDREDS_WORDS: Record<string, number> = {
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

const TENS_WORDS: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};

const SMALL_NUMBER_WORDS: Record<string, number> = {
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
};

function normalizeSpokenNumbers(input: string): string {
  let text = input.trim();

  // "dois reais" / "um real"
  text = text.replace(/\buma?\s+real\b/gi, '1 real');
  text = text.replace(/\b(\d+|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s+(?:vezes|parcelas)\b/gi, (_, numWord: string) => {
    const lower = numWord.toLowerCase();
    const mapped = SMALL_NUMBER_WORDS[lower] ?? (/^\d+$/.test(lower) ? Number(lower) : null);
    return mapped ? `${mapped}x` : _;
  });

  // "mil e duzentos", "2 mil e quinhentos", "mil"
  text = text.replace(
    /\b(?:(\d+|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove)\s+)?mil(?:\s+e\s+(duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|cem))?\b/gi,
    (_, mult: string | undefined, hundredWord: string | undefined) => {
      let thousands = 1;
      if (mult) {
        const lower = mult.toLowerCase();
        thousands = SMALL_NUMBER_WORDS[lower] ?? Number(lower) ?? 1;
      }
      const hundred = hundredWord ? HUNDREDS_WORDS[hundredWord.toLowerCase()] || 0 : 0;
      return String(thousands * 1000 + hundred);
    }
  );

  // Compound tens + units: "cinquenta e cinco", "trinta e quatro"
  text = text.replace(
    /\b(vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)\s+e\s+(dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove)\b/gi,
    (_, tens: string, unit: string) => {
      const tVal = TENS_WORDS[tens.toLowerCase()] || 0;
      const uVal = SMALL_NUMBER_WORDS[unit.toLowerCase()] || 0;
      return String(tVal + uVal);
    }
  );

  // Standalone unambiguous number words
  text = text.replace(
    /\b(duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|cem|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove)\b/gi,
    (word: string) => {
      const lower = word.toLowerCase();
      const val =
        HUNDREDS_WORDS[lower] ?? TENS_WORDS[lower] ?? SMALL_NUMBER_WORDS[lower];
      return val !== undefined ? String(val) : word;
    }
  );

  // Normalize spoken decimal cents: "55 e 90" or "55 reais e 90 centavos" -> "55,90"
  text = text.replace(
    /(\d{1,6})\s*(?:reais\s*)?e\s*(\d{1,2})(?!\d)(?:\s*centavos)?\b/gi,
    (_, reais: string, centavos: string) => `${reais},${centavos.padStart(2, '0')}`
  );

  return text;
}

function stripNonMonetaryTokens(segment: string): string {
  return segment
    .replace(/\b(?:em\s+|parcelado\s+em\s+)?\d{1,2}\s*(?:x|vezes|parcelas?)\b/gi, ' ')
    .replace(/\bdia\s+\d{1,2}\b/gi, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ');
}

function parseBRLTokenToCents(rawToken: string): number {
  let clean = rawToken.trim();
  if (!clean) return 0;

  if (clean.includes(',') && clean.includes('.')) {
    // 1.200,50 -> 1200.50
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // 55,90 -> 55.90
    clean = clean.replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(clean)) {
    // 1.200 -> 1200
    clean = clean.replace(/\./g, '');
  }

  const num = Number(clean);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

function extractAmountAndInstallments(segment: string): {
  amountCents: number;
  installmentsCount: number;
} {
  // Pattern: "10x de 120" -> 10 installments totaling 1200
  const perInstallmentMatch = segment.match(
    /\b(\d{1,2})\s*(?:x|vezes|parcelas?)\s+de\s+(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i
  );
  if (perInstallmentMatch) {
    const count = Math.min(48, Math.max(1, Number(perInstallmentMatch[1])));
    const perPartCents = parseBRLTokenToCents(perInstallmentMatch[2]);
    if (perPartCents > 0) {
      return {
        installmentsCount: count,
        amountCents: perPartCents * count,
      };
    }
  }

  const instMatch = segment.match(
    /\b(?:em\s+|parcelado\s+em\s+)?(\d{1,2})\s*(?:x|vezes|parcelas?)\b/i
  );
  const installmentsCount = instMatch
    ? Math.min(48, Math.max(1, Number(instMatch[1])))
    : 1;

  const monetaryOnly = stripNonMonetaryTokens(segment);
  const moneyMatches = monetaryOnly.match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi
  );

  if (!moneyMatches || moneyMatches.length === 0) {
    return { amountCents: 0, installmentsCount };
  }

  const rawNum = moneyMatches[0].replace(/r\$\s*/i, '');
  return {
    amountCents: parseBRLTokenToCents(rawNum),
    installmentsCount,
  };
}

function splitVoiceClauses(normalizedText: string): string[] {
  const parts = normalizedText.split(
    /\s*;\s*|\s*,\s+|\s+(?:e\s+tamb[eé]m|al[eé]m\s+disso|depois|e)\s+/gi
  );

  const clauses: string[] = [];
  let buffer = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (!buffer) {
      buffer = trimmed;
      continue;
    }

    const bufferHasAmount = extractAmountAndInstallments(buffer).amountCents > 0;
    const partHasAmount = extractAmountAndInstallments(trimmed).amountCents > 0;

    if (bufferHasAmount && partHasAmount) {
      clauses.push(buffer);
      buffer = trimmed;
    } else {
      buffer = `${buffer} ${trimmed}`.trim();
    }
  }

  if (buffer) {
    clauses.push(buffer);
  }

  return clauses;
}

const CATEGORY_KEYWORDS: Array<{ slug: string; keywords: string[] }> = [
  {
    slug: 'cat_transporte',
    keywords: [
      'uber',
      '99',
      'taxi',
      'gasolina',
      'combustivel',
      'etanol',
      'alcool',
      'posto',
      'estacionamento',
      'pedagio',
      'onibus',
      'metro',
      'passagem',
      'oficina',
      'mecanico',
      'ipva',
      'carro',
      'moto',
    ],
  },
  {
    slug: 'cat_mercado',
    keywords: [
      'mercado',
      'supermercado',
      'atacadao',
      'assai',
      'carrefour',
      'pao de acucar',
      'hortifruti',
      'feira',
      'acougue',
      'sacolao',
      'compra do mes',
    ],
  },
  {
    slug: 'cat_alimentacao',
    keywords: [
      'almoco',
      'janta',
      'jantar',
      'lanche',
      'cafe',
      'padaria',
      'restaurante',
      'ifood',
      'delivery',
      'pizza',
      'hamburguer',
      'acai',
      'sorvete',
      'salgado',
      'marmita',
      'alimentacao',
      'comida',
    ],
  },
  {
    slug: 'cat_moradia',
    keywords: [
      'aluguel',
      'condominio',
      'luz',
      'energia',
      'agua',
      'gas',
      'internet',
      'wifi',
      'wi-fi',
      'iptu',
      'reforma',
      'faxina',
      'moradia',
      'casa',
    ],
  },
  {
    slug: 'cat_saude',
    keywords: [
      'farmacia',
      'remedio',
      'medicamento',
      'medico',
      'dentista',
      'consulta',
      'exame',
      'hospital',
      'academia',
      'plano de saude',
      'terapia',
      'saude',
    ],
  },
  {
    slug: 'cat_educacao',
    keywords: ['faculdade', 'escola', 'curso', 'livro', 'mensalidade escolar', 'ingles', 'educacao'],
  },
  {
    slug: 'cat_lazer',
    keywords: ['cinema', 'teatro', 'show', 'viagem', 'hotel', 'parque', 'jogo', 'game', 'festa', 'bar', 'cerveja', 'lazer'],
  },
  {
    slug: 'cat_compras',
    keywords: [
      'renner',
      'zara',
      'riachuelo',
      'c&a',
      'shein',
      'shopee',
      'amazon',
      'mercado livre',
      'shopping',
      'roupa',
      'roupas',
      'tenis',
      'sapato',
      'camisa',
      'calca',
      'eletronico',
      'celular',
      'presente',
      'compra',
      'compras',
    ],
  },
  {
    slug: 'cat_pets',
    keywords: ['pet', 'pets', 'racao', 'veterinario', 'banho e tosa', 'cachorro', 'gato'],
  },
  {
    slug: 'cat_impostos',
    keywords: ['imposto', 'impostos', 'taxa', 'taxas', 'multa', 'cartorio', 'tarifa', 'anuidade', 'iof', 'darf'],
  },
  {
    slug: 'cat_assinaturas',
    keywords: ['assinatura', 'assinaturas', 'streaming'],
  },
  {
    slug: 'cat_salario',
    keywords: ['salario', 'pagamento', 'adiantamento', 'decimo terceiro', '13o'],
  },
  {
    slug: 'cat_outras_receitas',
    keywords: ['freela', 'freelance', 'bonus', 'reembolso', 'venda', 'rendimento', 'dividendo'],
  },
];

function findCategory(
  clause: string,
  type: TransactionType,
  categories: Category[],
  matchedSubscription?: SubscriptionPreset
): Category | undefined {
  const sameType = categories.filter((c) => c.type === type);
  const pool = sameType.length > 0 ? sameType : categories;
  if (pool.length === 0) return undefined;

  if (matchedSubscription && type === 'expense') {
    const subCat = pool.find(
      (c) =>
        c.id.endsWith('cat_assinaturas') ||
        normalizeForMatch(c.name).includes('assinatura')
    );
    if (subCat) return subCat;
  }

  const normalizedClause = normalizeForMatch(clause);
  const tokens = normalizedClause.split(/[^a-z0-9]+/).filter(Boolean);

  // Match custom/exact category names first
  for (const cat of pool) {
    const normName = normalizeForMatch(cat.name);
    if (normName && normalizedClause.includes(normName)) {
      return cat;
    }
  }

  // Match keyword dictionary
  for (const entry of CATEGORY_KEYWORDS) {
    const hit = entry.keywords.some((kw) =>
      kw.length <= 3 ? tokens.includes(kw) : normalizedClause.includes(kw)
    );
    if (hit) {
      const cat = pool.find(
        (c) =>
          c.id.endsWith(entry.slug) ||
          normalizeForMatch(c.name) === normalizeForMatch(entry.slug.replace('cat_', ''))
      );
      if (cat) return cat;
    }
  }

  const fallback = pool.find(
    (c) =>
      c.id.endsWith('cat_outros') ||
      c.id.endsWith('cat_outras_receitas') ||
      normalizeForMatch(c.name).includes('outro')
  );
  return fallback || pool[0];
}

function detectPaymentMethod(
  clause: string,
  installmentsCount: number,
  defaultMethod: PaymentMethod
): PaymentMethod {
  const norm = normalizeForMatch(clause);
  if (
    installmentsCount > 1 ||
    /\b(credito|cartao\s+de\s+credito|no\s+cartao|cartao|parcelado)\b/.test(norm)
  ) {
    return 'credit';
  }
  if (/\bdebito\b/.test(norm)) return 'debit';
  if (/\bpix\b/.test(norm)) return 'pix';
  if (/\b(dinheiro|especie|carteira)\b/.test(norm)) return 'cash';
  if (/\bboleto\b/.test(norm)) return 'boleto';
  if (/\b(transferencia|ted|doc)\b/.test(norm)) return 'transfer';
  return defaultMethod;
}

function detectAccount(
  clause: string,
  paymentMethod: PaymentMethod,
  accounts: Account[],
  defaultAccountId: string
): Account | undefined {
  if (accounts.length === 0) return undefined;

  const normClause = normalizeForMatch(clause);
  for (const acc of accounts) {
    const normAcc = normalizeForMatch(acc.name);
    if (normAcc.length >= 2 && normClause.includes(normAcc)) {
      return acc;
    }
  }

  const bankHit = matchBankByName(clause);
  if (bankHit) {
    const byBank = accounts.find((acc) => matchBankByName(acc.name)?.id === bankHit.id);
    if (byBank) return byBank;
  }

  if (paymentMethod === 'credit') {
    const creditAcc = accounts.find((a) => a.kind === 'credit_card');
    if (creditAcc) return creditAcc;
  } else if (paymentMethod === 'cash') {
    const cashAcc = accounts.find((a) => a.kind === 'cash' || a.kind === 'wallet');
    if (cashAcc) return cashAcc;
  }

  return accounts.find((a) => a.id === defaultAccountId) || accounts[0];
}

function cleanVoiceDescription(
  rawSegment: string,
  fallbackCategoryName: string,
  matchedSubscription?: SubscriptionPreset
): string {
  if (matchedSubscription) {
    return matchedSubscription.name;
  }

  let desc = rawSegment
    // Verbs
    .replace(
      /\b(gastei|comprei|paguei|assinei|recebi|ganhei|entrou|foi|lancamento|lançamento)\b/gi,
      ' '
    )
    // Installment patterns
    .replace(/\b(?:parcelado\s+)?(?:em\s+)?\d{1,2}\s*(?:x|vezes|parcelas?)(?:\s+de\s+(?:r\$\s*)?\d+(?:[.,]\d{1,2})?)?/gi, ' ')
    // Payment method phrases
    .replace(
      /\b(?:no|na|via|em|com|por)?\s*(?:cart[aã]o\s+de\s+cr[eé]dito|cart[aã]o\s+de\s+d[eé]bito|cr[eé]dito|d[eé]bito|cart[aã]o|pix|dinheiro|esp[eé]cie|boleto|transfer[eê]ncia|parcelado)\b/gi,
      ' '
    )
    // Monetary numbers and currency words
    .replace(/r\$\s*/gi, ' ')
    .replace(/\b\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\b|\b\d+(?:[.,]\d{1,2})?\b/g, ' ')
    .replace(/\b(reais|real|centavos?)\b/gi, ' ')
    // Time noise
    .replace(/\b(hoje|ontem)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Trim leading/trailing Portuguese prepositions repeatedly
  let prev = '';
  while (desc !== prev) {
    prev = desc;
    desc = desc
      .replace(/^(?:de|da|do|das|dos|na|no|nas|nos|em|para|pra|por|com|a|o|e|um|uma)\b\s*/i, '')
      .replace(/\s*\b(?:de|da|do|das|dos|na|no|nas|nos|em|para|pra|por|com|a|o|e|um|uma)$/i, '')
      .trim();
  }

  if (!desc) return fallbackCategoryName;
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

export function parseVoiceTransactions(
  transcript: string,
  context: VoiceParserContext
): ParsedVoiceTransaction[] {
  const trimmed = transcript.trim();
  if (!trimmed) return [];

  const normalized = normalizeSpokenNumbers(trimmed);
  const clauses = splitVoiceClauses(normalized);
  const results: ParsedVoiceTransaction[] = [];

  clauses.forEach((clause, idx) => {
    const { amountCents, installmentsCount } = extractAmountAndInstallments(clause);
    if (amountCents <= 0) return;

    const norm = normalizeForMatch(clause);
    let type: TransactionType = context.defaultType;
    if (
      /\b(recebi|recebimento|salario|ganhei|freela|freelance|rendimento|dividendo|venda|reembolso|entrou)\b/.test(
        norm
      )
    ) {
      type = 'income';
    } else if (
      /\b(gastei|comprei|paguei|assinei|despesa|fatura|boleto)\b/.test(norm)
    ) {
      type = 'expense';
    }

    const paymentMethod = detectPaymentMethod(
      clause,
      installmentsCount,
      context.defaultPaymentMethod
    );
    const matchedSubscription =
      type === 'expense' ? matchSubscriptionByName(clause) : undefined;
    const category = findCategory(clause, type, context.categories, matchedSubscription);
    const account = detectAccount(
      clause,
      paymentMethod,
      context.accounts,
      context.defaultAccountId
    );
    const description = cleanVoiceDescription(
      clause,
      category?.name || (type === 'expense' ? 'Despesa' : 'Receita'),
      matchedSubscription
    );

    results.push({
      id: `voice_${idx}_${description}_${amountCents}`,
      rawSegment: clause,
      type,
      amountCents,
      description,
      categoryId: category?.id || '',
      categoryName: category?.name || (type === 'expense' ? 'Outros' : 'Outras receitas'),
      accountId: account?.id || context.defaultAccountId,
      accountName: account?.name || 'Conta',
      paymentMethod,
      date: context.defaultDate,
      installmentsCount: type === 'expense' && paymentMethod === 'credit' ? installmentsCount : 1,
      matchedSubscription,
    });
  });

  return results;
}
