import { describe, it, expect, beforeEach } from 'vitest';
import { AppDatabase } from '@/data/db';
import { LocalTransactionRepository, LocalCategoryRepository } from './localRepository';
import { useSessionStore } from '@/data/session';

describe('multi-workspace data isolation', () => {
  let testDb: AppDatabase;
  let txRepo: LocalTransactionRepository;
  let catRepo: LocalCategoryRepository;

  beforeEach(async () => {
    // Unique db name for test isolation
    testDb = new AppDatabase(`test_iso_${Math.random()}`);
    txRepo = new LocalTransactionRepository(testDb);
    catRepo = new LocalCategoryRepository(testDb);

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
});
