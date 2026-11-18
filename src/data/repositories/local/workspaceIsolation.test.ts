import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '@/data/db';
import {
  LocalTransactionRepository,
  LocalCategoryRepository,
  LocalRecurringRepository,
} from './localRepository';
import { useSessionStore } from '@/data/session';
import { generateInstallmentPlan } from '@/shared/lib/installments';
import { mergeByUpdatedAt } from '@/data/supabaseSync';

describe('multi-workspace data isolation', () => {
  let testDb: AppDatabase;
  let txRepo: LocalTransactionRepository;
  let catRepo: LocalCategoryRepository;
  let recRepo: LocalRecurringRepository;

  beforeEach(async () => {
    // Unique db name for test isolation
    testDb = new AppDatabase(`test_iso_${Math.random()}`);
    txRepo = new LocalTransactionRepository(testDb);
    catRepo = new LocalCategoryRepository(testDb);
    recRepo = new LocalRecurringRepository(testDb);

    // Setup 2 distinct workspaces and users
    await testDb.workspaces.bulkAdd([
      { id: 'ws_alpha', name: 'Alpha Finance', currency: 'BRL', createdAt: '2026-01-01' },
      { id: 'ws_beta', name: 'Beta Finance', currency: 'BRL', createdAt: '2026-01-01' },
    ]);

    await testDb.users.bulkAdd([
      { id: 'usr_alpha', displayName: 'User Alpha', avatarColor: '#22C55E' },
      { id: 'usr_beta', displayName: 'User Beta', avatarColor: '#3B82F6' },
    ]);
  });

  it('guarantees that queries never leak transactions from other workspaces', async () => {
    // 1. Logged in as Alpha
    useSessionStore.getState().setSession('usr_alpha', 'ws_alpha');

    const txAlpha = await txRepo.create({
      type: 'expense',
      amountCents: 5000,
      description: 'Alpha Secret Expense',
      categoryId: 'cat_alpha',
      accountId: 'acc_alpha',
      paymentMethod: 'pix',
      date: '2026-10-10',
    });

    const alphaList = await txRepo.list();
    expect(alphaList).toHaveLength(1);
    expect(alphaList[0].id).toBe(txAlpha.id);

    // 2. Switch session to Beta
    useSessionStore.getState().setSession('usr_beta', 'ws_beta');

    // Beta's list MUST be empty
    const betaListInitial = await txRepo.list();
    expect(betaListInitial).toHaveLength(0);

    // Beta cannot get Alpha's transaction by ID
    const leakedTx = await txRepo.getById(txAlpha.id);
    expect(leakedTx).toBeUndefined();

    // Create a transaction in Beta
    const txBeta = await txRepo.create({
      type: 'expense',
      amountCents: 9900,
      description: 'Beta Expense',
      categoryId: 'cat_beta',
      accountId: 'acc_beta',
      paymentMethod: 'credit',
      date: '2026-10-10',
    });

    const betaList = await txRepo.list();
    expect(betaList).toHaveLength(1);
    expect(betaList[0].description).toBe('Beta Expense');

    // 3. Switch back to Alpha: cannot see Beta's transaction
    useSessionStore.getState().setSession('usr_alpha', 'ws_alpha');
    const alphaListFinal = await txRepo.list();
    expect(alphaListFinal).toHaveLength(1);
    expect(alphaListFinal[0].description).toBe('Alpha Secret Expense');
    expect(await txRepo.getById(txBeta.id)).toBeUndefined();
  });

  it('guarantees category isolation across workspaces', async () => {
    // Logged in as Alpha
    useSessionStore.getState().setSession('usr_alpha', 'ws_alpha');
    await catRepo.create({
      name: 'Alpha Category',
      icon: 'Tag',
      color: '#22C55E',
      type: 'expense',
      archived: false,
    });

    const alphaCats = await catRepo.list();
    expect(alphaCats).toHaveLength(1);

    // Switch to Beta
    useSessionStore.getState().setSession('usr_beta', 'ws_beta');
    const betaCats = await catRepo.list();
    expect(betaCats).toHaveLength(0);
  });

  it('updates all 24 installments (including past/confirmed 1..9 and future 11..24) when editing installment 10/24 via updateSeries', async () => {
    useSessionStore.getState().setSession('usr_alpha', 'ws_alpha');

    const groupId = 'group_renner_24x';
    const plan = generateInstallmentPlan({
      totalAmountCents: 100000, // R$ 1.000,00 in 24x -> remainder goes to 1/24
      installmentsCount: 24,
      firstDate: '2026-01-10',
      initialCompetence: '2026-01',
      baseDescription: 'Renner',
    });

    const created = await txRepo.createMany(
      plan.map((item) => ({
        type: 'expense',
        amountCents: item.amountCents,
        description: item.description,
        categoryId: 'cat_alimentacao',
        accountId: 'acc_old',
        paymentMethod: 'credit',
        date: item.date,
        competence: item.competence,
        status: item.installmentNumber <= 10 ? 'confirmed' : 'planned',
        installment: {
          groupId,
          number: item.installmentNumber,
          total: item.totalInstallments,
        },
      }))
    );

    expect(created).toHaveLength(24);
    const installment10 = created.find((t) => t.installment?.number === 10)!;
    expect(installment10).toBeDefined();

    const updatedCount = await txRepo.updateSeries(installment10.id, {
      categoryId: 'cat_compras',
      accountId: 'acc_nubank',
      baseDescription: 'Renner Roupas',
    });

    expect(updatedCount).toBe(24);

    const siblingsAfter = await txRepo.findSeriesSiblings(installment10.id);
    expect(siblingsAfter).toHaveLength(24);

    siblingsAfter.forEach((tx, idx) => {
      const expected = plan[idx];
      expect(tx.installment?.number).toBe(expected.installmentNumber);
      expect(tx.categoryId).toBe('cat_compras');
      expect(tx.accountId).toBe('acc_nubank');
      expect(tx.description).toBe(`Renner Roupas (${expected.installmentNumber}/24)`);
      expect(tx.date).toBe(expected.date);
      expect(tx.competence).toBe(expected.competence);
      expect(tx.amountCents).toBe(expected.amountCents);
      expect(tx.status).toBe(expected.installmentNumber <= 10 ? 'confirmed' : 'planned');
    });
  });

  it('guarantees bidirectional sync never loses local-only records or newer local edits', () => {
    const localItems = [
      { id: '1', updatedAt: '2026-11-16T12:00:00Z', name: 'Newer Local Card' },
      { id: '2', updatedAt: '2026-11-16T10:00:00Z', name: 'Outdated Local Tx' },
      { id: '3', updatedAt: '2026-11-16T11:00:00Z', name: 'Offline Local Only' },
    ];
    const remoteItems = [
      { id: '1', updatedAt: '2026-11-16T09:00:00Z', name: 'Stale Cloud Card' },
      { id: '2', updatedAt: '2026-11-16T12:30:00Z', name: 'Newer Cloud Tx' },
      { id: '4', updatedAt: '2026-11-16T08:00:00Z', name: 'Other Device Tx' },
    ];

    const { toSaveLocally, toPushRemotely } = mergeByUpdatedAt(localItems, remoteItems);

    expect(toSaveLocally.map((i) => i.id)).toEqual(['2', '4']);
    expect(toSaveLocally.find((i) => i.id === '2')?.name).toBe('Newer Cloud Tx');

    expect(toPushRemotely.map((i) => i.id)).toEqual(['1', '3']);
    expect(toPushRemotely.find((i) => i.id === '1')?.name).toBe('Newer Local Card');
    expect(toPushRemotely.find((i) => i.id === '3')?.name).toBe('Offline Local Only');
  });

  it('creates a monthly recurring Netflix subscription and stops + soft-deletes all linked items via softDeleteByRecurringRule', async () => {
    useSessionStore.getState().setSession('usr_alpha', 'ws_alpha');

    const rule = await recRepo.create({
      templateTransaction: {
        description: 'Netflix',
        amountCents: 5590,
        type: 'expense',
        categoryId: 'ws_alpha__cat_assinaturas',
        accountId: 'acc_credit',
        paymentMethod: 'credit',
        tags: ['recorrente'],
        visibility: 'shared',
        paidBy: 'usr_alpha',
      },
      dayOfMonth: 18,
      startCompetence: '2026-11',
      active: true,
    });

    await txRepo.create({
      type: 'expense',
      amountCents: 5590,
      description: 'Netflix',
      categoryId: 'ws_alpha__cat_assinaturas',
      accountId: 'acc_credit',
      paymentMethod: 'credit',
      date: '2026-11-18',
      status: 'confirmed',
      recurringRuleId: rule.id,
      tags: ['recorrente'],
    });

    // Simulate entering the next month so recurringRepository auto-creates 2026-12 planned entry
    const generated = await recRepo.ensurePlannedForCompetence('2026-12');
    expect(generated).toBe(1);

    const beforeDelete = await txRepo.list();
    expect(beforeDelete).toHaveLength(2);
    expect(beforeDelete.every((t) => t.recurringRuleId === rule.id)).toBe(true);

    await txRepo.softDeleteByRecurringRule(rule.id);

    const afterDeleteTxs = await txRepo.list();
    expect(afterDeleteTxs).toHaveLength(0);

    const activeRules = await recRepo.listActive();
    expect(activeRules).toHaveLength(0);
  });
});
