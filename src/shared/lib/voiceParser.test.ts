import { describe, it, expect } from 'vitest';
import { parseVoiceTransactions, VoiceParserContext } from './voiceParser';
import { Account, Category } from '@/data/db';

const MOCK_CATEGORIES: Category[] = [
  {
    id: 'ws__cat_transporte',
    workspaceId: 'ws',
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    name: 'Transporte',
    icon: 'Car',
    color: '#6366F1',
    type: 'expense',
    archived: false,
  },
  {
    id: 'ws__cat_assinaturas',
    workspaceId: 'ws',
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    name: 'Assinaturas',
    icon: 'Tv',
    color: '#F97316',
    type: 'expense',
    archived: false,
  },
  {
    id: 'ws__cat_compras',
    workspaceId: 'ws',
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    name: 'Compras',
    icon: 'ShoppingBag',
    color: '#EAB308',
    type: 'expense',
    archived: false,
  },
  {
    id: 'ws__cat_outros',
    workspaceId: 'ws',
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    name: 'Outros',
    icon: 'MoreHorizontal',
    color: '#71717A',
    type: 'expense',
    archived: false,
  },
  {
    id: 'ws__cat_salario',
    workspaceId: 'ws',
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    name: 'Salário',
    icon: 'Briefcase',
    color: '#22C55E',
    type: 'income',
    archived: false,
  },
];

const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc_checking',
    workspaceId: 'ws',
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    name: 'Conta Corrente',
    kind: 'checking',
    ownerId: 'u1',
  },
  {
    id: 'acc_nubank',
    workspaceId: 'ws',
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    name: 'Nubank Crédito',
    kind: 'credit_card',
    ownerId: 'u1',
    closingDay: 25,
    dueDay: 5,
  },
];

const BASE_CONTEXT: VoiceParserContext = {
  categories: MOCK_CATEGORIES,
  accounts: MOCK_ACCOUNTS,
  defaultDate: '2026-11-16',
  defaultType: 'expense',
  defaultPaymentMethod: 'pix',
  defaultAccountId: 'acc_checking',
};

describe('Portuguese voice transaction parser', () => {
  it('parses a single expense with PIX and category detection', () => {
    const res = parseVoiceTransactions('Gastei 35 reais de Uber no Pix', BASE_CONTEXT);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      type: 'expense',
      amountCents: 3500,
      description: 'Uber',
      paymentMethod: 'pix',
      categoryId: 'ws__cat_transporte',
      installmentsCount: 1,
    });
  });

  it('parses a credit card installment purchase cleanly', () => {
    const res = parseVoiceTransactions(
      'Comprei roupas na Renner 1200 reais em 10x no cartão Nubank',
      BASE_CONTEXT
    );
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      type: 'expense',
      amountCents: 120000,
      installmentsCount: 10,
      paymentMethod: 'credit',
      categoryId: 'ws__cat_compras',
      accountId: 'acc_nubank',
    });
    expect(res[0].description.toLowerCase()).toContain('renner');
  });

  it('parses a subscription with spoken cents ("55 e 90") and matches brand logo', () => {
    const res = parseVoiceTransactions('Assinei Netflix 55 e 90 no crédito', BASE_CONTEXT);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      type: 'expense',
      amountCents: 5590,
      description: 'Netflix',
      paymentMethod: 'credit',
      categoryId: 'ws__cat_assinaturas',
      accountId: 'acc_nubank',
    });
    expect(res[0].matchedSubscription?.id).toBe('netflix');
  });

  it('splits multiple spoken transactions in the same utterance', () => {
    const res = parseVoiceTransactions(
      'Gastei 35 de Uber no pix e 55 e 90 da Netflix no cartão e recebi 2500 de salário',
      BASE_CONTEXT
    );
    expect(res).toHaveLength(3);
    expect(res[0]).toMatchObject({
      type: 'expense',
      amountCents: 3500,
      description: 'Uber',
      paymentMethod: 'pix',
      categoryId: 'ws__cat_transporte',
    });
    expect(res[1]).toMatchObject({
      type: 'expense',
      amountCents: 5590,
      description: 'Netflix',
      paymentMethod: 'credit',
      categoryId: 'ws__cat_assinaturas',
    });
    expect(res[1].matchedSubscription?.id).toBe('netflix');
    expect(res[2]).toMatchObject({
      type: 'income',
      amountCents: 250000,
      description: 'Salário',
      categoryId: 'ws__cat_salario',
    });
  });
});
