import { AppDatabase, db, Transaction, Category, Account, Budget, RecurringRule, WorkspaceSettings, UserPreferences } from '@/data/db';
import { getCurrentSession } from '@/data/session';
import {
  ITransactionRepository,
  ICategoryRepository,
  IAccountRepository,
  IBudgetRepository,
  IRecurringRepository,
  ISettingsRepository,
  CreateTransactionDTO,
  TransactionFilters,
} from '../interfaces';
import { determineTransactionCompetence } from '@/shared/lib/competence';
import { isRuleActiveForCompetence, getRecurrenceDateForCompetence } from '@/shared/lib/recurrence';
import { getPreviousCompetence } from '@/shared/lib/dates';
import { addDays, format } from 'date-fns';
import {
  syncTransactionToSupabase,
  syncCategoryToSupabase,
  syncAccountToSupabase,
  syncBudgetToSupabase,
  syncRecurringRuleToSupabase,
  syncSettingsToSupabase,
  syncPreferencesToSupabase,
} from '@/data/supabaseSync';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export class LocalTransactionRepository implements ITransactionRepository {
  constructor(private database: AppDatabase = db) {}

  private getSessionContext() {
    const { userId, workspaceId } = getCurrentSession();
    if (!workspaceId || !userId) {
      throw new Error('Sessão não inicializada: workspaceId ou userId ausente');
    }
    return { userId, workspaceId };
  }

  async list(filters?: TransactionFilters): Promise<Transaction[]> {
    const { workspaceId } = this.getSessionContext();

    // Query active items in workspace
    let query = this.database.transactions
      .where('workspaceId')
      .equals(workspaceId)
      .filter((tx) => !tx.deletedAt);

    if (filters?.competence) {
      query = query.filter((tx) => tx.competence === filters.competence);
    }
    if (filters?.categoryId) {
      query = query.filter((tx) => tx.categoryId === filters.categoryId);
    }
    if (filters?.accountId) {
      query = query.filter((tx) => tx.accountId === filters.accountId);
    }
    if (filters?.paymentMethod) {
      query = query.filter((tx) => tx.paymentMethod === filters.paymentMethod);
    }
    if (filters?.type) {
      query = query.filter((tx) => tx.type === filters.type);
    }
    if (filters?.status) {
      query = query.filter((tx) => tx.status === filters.status);
    }
    if (filters?.paidBy) {
      query = query.filter((tx) => tx.paidBy === filters.paidBy);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase().trim();
      query = query.filter(
        (tx) =>
          tx.description.toLowerCase().includes(s) ||
          tx.tags.some((tag) => tag.toLowerCase().includes(s))
      );
    }

    const items = await query.toArray();
    // Sort descending by date
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getById(id: string): Promise<Transaction | undefined> {
    const { workspaceId } = this.getSessionContext();
    const tx = await this.database.transactions.get(id);
    if (!tx || tx.workspaceId !== workspaceId || tx.deletedAt) {
      return undefined;
    }
    return tx;
  }

  async create(dto: CreateTransactionDTO): Promise<Transaction> {
    const { userId, workspaceId } = this.getSessionContext();
    const now = new Date().toISOString();

    // If competence is not given, calculate based on workspace settings and account
    let competence = dto.competence;
    if (!competence) {
      const settings = await this.database.settings.get(workspaceId);
      const competenceMode = settings?.competenceMode || 'purchase_date';
      let closingDay: number | undefined;
      if (dto.paymentMethod === 'credit' && dto.accountId) {
        const account = await this.database.accounts.get(dto.accountId);
        closingDay = account?.closingDay;
      }
      competence = determineTransactionCompetence({
        date: dto.date,
        paymentMethod: dto.paymentMethod,
        cardClosingDay: closingDay,
        competenceMode,
      });
    }

    const record: Transaction = {
      id: generateId(),
      workspaceId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      type: dto.type,
      amountCents: dto.amountCents,
      description: dto.description,
      categoryId: dto.categoryId,
      accountId: dto.accountId,
      paymentMethod: dto.paymentMethod,
      date: dto.date,
      competence,
      status: dto.status || 'confirmed',
      installment: dto.installment,
      recurringRuleId: dto.recurringRuleId,
      tags: dto.tags || [],
      paidBy: dto.paidBy || userId,
      visibility: dto.visibility || 'shared',
    };

    await this.database.transactions.add(record);
    syncTransactionToSupabase(record);
    return record;
  }

  async createMany(dtos: CreateTransactionDTO[]): Promise<Transaction[]> {
    const { userId, workspaceId } = this.getSessionContext();
    const now = new Date().toISOString();
    const settings = await this.database.settings.get(workspaceId);
    const competenceMode = settings?.competenceMode || 'purchase_date';

    const records: Transaction[] = [];

    for (const dto of dtos) {
      let competence = dto.competence;
      if (!competence) {
        let closingDay: number | undefined;
        if (dto.paymentMethod === 'credit' && dto.accountId) {
          const account = await this.database.accounts.get(dto.accountId);
          closingDay = account?.closingDay;
        }
        competence = determineTransactionCompetence({
          date: dto.date,
          paymentMethod: dto.paymentMethod,
          cardClosingDay: closingDay,
          competenceMode,
        });
      }

      records.push({
        id: generateId(),
        workspaceId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        type: dto.type,
        amountCents: dto.amountCents,
        description: dto.description,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        paymentMethod: dto.paymentMethod,
        date: dto.date,
        competence,
        status: dto.status || 'confirmed',
        installment: dto.installment,
        recurringRuleId: dto.recurringRuleId,
        tags: dto.tags || [],
        paidBy: dto.paidBy || userId,
        visibility: dto.visibility || 'shared',
      });
    }

    await this.database.transactions.bulkAdd(records);
    syncTransactionToSupabase(records);
    return records;
  }

  async update(id: string, updates: Partial<Transaction>): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getById(id);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('Transação não encontrada ou acesso negado');
    }

    const updatedAt = new Date().toISOString();
    await this.database.transactions.update(id, {
      ...updates,
      updatedAt,
    });
    syncTransactionToSupabase({ ...existing, ...updates, updatedAt });
  }

  async softDelete(id: string): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getById(id);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('Transação não encontrada ou acesso negado');
    }

    const now = new Date().toISOString();
    await this.database.transactions.update(id, {
      deletedAt: now,
      updatedAt: now,
    });
    syncTransactionToSupabase({ ...existing, deletedAt: now, updatedAt: now });
  }

  async softDeleteGroup(groupId: string, fromInstallmentNumber?: number): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const now = new Date().toISOString();

    const groupTransactions = await this.database.transactions
      .where('workspaceId')
      .equals(workspaceId)
      .filter((t) => !t.deletedAt && t.installment?.groupId === groupId)
      .toArray();

    const targets = fromInstallmentNumber
      ? groupTransactions.filter((t) => (t.installment?.number || 0) >= fromInstallmentNumber)
      : groupTransactions;

    for (const t of targets) {
      await this.database.transactions.update(t.id, {
        deletedAt: now,
        updatedAt: now,
      });
    }
    if (targets.length > 0) {
      syncTransactionToSupabase(targets.map((t) => ({ ...t, deletedAt: now, updatedAt: now })));
    }
  }

  async restore(id: string): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const tx = await this.database.transactions.get(id);
    if (!tx || tx.workspaceId !== workspaceId) {
      throw new Error('Transação não encontrada');
    }

    const updatedAt = new Date().toISOString();
    await this.database.transactions.update(id, {
      deletedAt: undefined,
      updatedAt,
    });
    syncTransactionToSupabase({ ...tx, deletedAt: undefined, updatedAt });
  }

  async getUpcomingPlanned(daysAhead: number): Promise<Transaction[]> {
    const { workspaceId } = this.getSessionContext();
    const today = new Date();
    const maxDate = addDays(today, daysAhead);
    const todayStr = format(today, 'yyyy-MM-dd');
    const maxDateStr = format(maxDate, 'yyyy-MM-dd');

    const items = await this.database.transactions
      .where('workspaceId')
      .equals(workspaceId)
      .filter(
        (tx) =>
          !tx.deletedAt &&
          tx.status === 'planned' &&
          tx.date >= todayStr &&
          tx.date <= maxDateStr
      )
      .toArray();

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export class LocalCategoryRepository implements ICategoryRepository {
  constructor(private database: AppDatabase = db) {}

  private getSessionContext() {
    const { userId, workspaceId } = getCurrentSession();
    if (!workspaceId || !userId) {
      throw new Error('Sessão não inicializada');
    }
    return { userId, workspaceId };
  }

  async list(type?: 'expense' | 'income'): Promise<Category[]> {
    const { workspaceId } = this.getSessionContext();
    let query = this.database.categories
      .where('workspaceId')
      .equals(workspaceId)
      .filter((c) => !c.deletedAt && !c.archived);

    if (type) {
      query = query.filter((c) => c.type === type);
    }
    return query.toArray();
  }

  async getById(id: string): Promise<Category | undefined> {
    const { workspaceId } = this.getSessionContext();
    const cat = await this.database.categories.get(id);
    if (!cat || cat.workspaceId !== workspaceId || cat.deletedAt) return undefined;
    return cat;
  }

  async create(category: Omit<Category, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const { userId, workspaceId } = this.getSessionContext();
    const now = new Date().toISOString();
    const record: Category = {
      ...category,
      id: generateId(),
      workspaceId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    await this.database.categories.add(record);
    syncCategoryToSupabase(record);
    return record;
  }

  async update(id: string, updates: Partial<Category>): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getById(id);
    if (!existing || existing.workspaceId !== workspaceId) throw new Error('Categoria não encontrada');

    const updatedAt = new Date().toISOString();
    await this.database.categories.update(id, {
      ...updates,
      updatedAt,
    });
    syncCategoryToSupabase({ ...existing, ...updates, updatedAt });
  }

  async archive(id: string): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getById(id);
    if (!existing || existing.workspaceId !== workspaceId) throw new Error('Categoria não encontrada');

    const updatedAt = new Date().toISOString();
    await this.database.categories.update(id, {
      archived: true,
      updatedAt,
    });
    syncCategoryToSupabase({ ...existing, archived: true, updatedAt });
  }
}

export class LocalAccountRepository implements IAccountRepository {
  constructor(private database: AppDatabase = db) {}

  private getSessionContext() {
    const { userId, workspaceId } = getCurrentSession();
    if (!workspaceId || !userId) throw new Error('Sessão não inicializada');
    return { userId, workspaceId };
  }

  async list(): Promise<Account[]> {
    const { workspaceId } = this.getSessionContext();
    return this.database.accounts
      .where('workspaceId')
      .equals(workspaceId)
      .filter((a) => !a.deletedAt)
      .toArray();
  }

  async getById(id: string): Promise<Account | undefined> {
    const { workspaceId } = this.getSessionContext();
    const acc = await this.database.accounts.get(id);
    if (!acc || acc.workspaceId !== workspaceId || acc.deletedAt) return undefined;
    return acc;
  }

  async create(account: Omit<Account, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const { userId, workspaceId } = this.getSessionContext();
    const now = new Date().toISOString();
    const record: Account = {
      ...account,
      id: generateId(),
      workspaceId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    await this.database.accounts.add(record);
    syncAccountToSupabase(record);
    return record;
  }

  async update(id: string, updates: Partial<Account>): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getById(id);
    if (!existing || existing.workspaceId !== workspaceId) throw new Error('Conta não encontrada');

    const updatedAt = new Date().toISOString();
    await this.database.accounts.update(id, {
      ...updates,
      updatedAt,
    });
    syncAccountToSupabase({ ...existing, ...updates, updatedAt });
  }

  async archive(id: string): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getById(id);
    if (!existing || existing.workspaceId !== workspaceId) throw new Error('Conta não encontrada');

    const now = new Date().toISOString();
    await this.database.accounts.update(id, {
      deletedAt: now,
      updatedAt: now,
    });
    syncAccountToSupabase({ ...existing, deletedAt: now, updatedAt: now });
  }
}

export class LocalBudgetRepository implements IBudgetRepository {
  constructor(private database: AppDatabase = db) {}

  private getSessionContext() {
    const { userId, workspaceId } = getCurrentSession();
    if (!workspaceId || !userId) throw new Error('Sessão não inicializada');
    return { userId, workspaceId };
  }

  async listByCompetence(competence: string): Promise<Budget[]> {
    const { workspaceId } = this.getSessionContext();
    return this.database.budgets
      .where('workspaceId')
      .equals(workspaceId)
      .filter((b) => !b.deletedAt && b.competence === competence)
      .toArray();
  }

  async getTotalBudget(competence: string): Promise<Budget | undefined> {
    const { workspaceId } = this.getSessionContext();
    const list = await this.database.budgets
      .where('workspaceId')
      .equals(workspaceId)
      .filter((b) => !b.deletedAt && b.competence === competence && b.categoryId === null)
      .toArray();
    return list[0];
  }

  async setBudget(competence: string, categoryId: string | null, limitCents: number): Promise<Budget> {
    const { userId, workspaceId } = this.getSessionContext();
    const now = new Date().toISOString();

    const existing = await this.database.budgets
      .where('workspaceId')
      .equals(workspaceId)
      .filter((b) => !b.deletedAt && b.competence === competence && b.categoryId === categoryId)
      .first();

    if (existing) {
      await this.database.budgets.update(existing.id, {
        limitCents,
        updatedAt: now,
      });
      const updated = { ...existing, limitCents, updatedAt: now };
      syncBudgetToSupabase(updated);
      return updated;
    }

    const record: Budget = {
      id: generateId(),
      workspaceId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      competence,
      categoryId,
      limitCents,
    };
    await this.database.budgets.add(record);
    syncBudgetToSupabase(record);
    return record;
  }

  async copyBudgetsFromPreviousMonth(targetCompetence: string): Promise<number> {
    const { userId, workspaceId } = this.getSessionContext();
    const prevCompetence = getPreviousCompetence(targetCompetence);
    const prevBudgets = await this.listByCompetence(prevCompetence);

    if (prevBudgets.length === 0) return 0;

    let copiedCount = 0;
    const now = new Date().toISOString();

    for (const b of prevBudgets) {
      const existing = await this.database.budgets
        .where('workspaceId')
        .equals(workspaceId)
        .filter((curr) => !curr.deletedAt && curr.competence === targetCompetence && curr.categoryId === b.categoryId)
        .first();

      if (!existing) {
        const record: Budget = {
          id: generateId(),
          workspaceId,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          competence: targetCompetence,
          categoryId: b.categoryId,
          limitCents: b.limitCents,
        };
        await this.database.budgets.add(record);
        syncBudgetToSupabase(record);
        copiedCount++;
      }
    }

    return copiedCount;
  }
}

export class LocalRecurringRepository implements IRecurringRepository {
  constructor(private database: AppDatabase = db) {}

  private getSessionContext() {
    const { userId, workspaceId } = getCurrentSession();
    if (!workspaceId || !userId) throw new Error('Sessão não inicializada');
    return { userId, workspaceId };
  }

  async listActive(): Promise<RecurringRule[]> {
    const { workspaceId } = this.getSessionContext();
    return this.database.recurringRules
      .where('workspaceId')
      .equals(workspaceId)
      .filter((r) => !r.deletedAt && r.active)
      .toArray();
  }

  async getById(id: string): Promise<RecurringRule | undefined> {
    const { workspaceId } = this.getSessionContext();
    const rule = await this.database.recurringRules.get(id);
    if (!rule || rule.workspaceId !== workspaceId || rule.deletedAt) return undefined;
    return rule;
  }

  async create(rule: Omit<RecurringRule, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<RecurringRule> {
    const { userId, workspaceId } = this.getSessionContext();
    const now = new Date().toISOString();
    const record: RecurringRule = {
      ...rule,
      id: generateId(),
      workspaceId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    await this.database.recurringRules.add(record);
    syncRecurringRuleToSupabase(record);
    return record;
  }

  async update(id: string, updates: Partial<RecurringRule>): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getById(id);
    if (!existing || existing.workspaceId !== workspaceId) throw new Error('Regra não encontrada');

    const updatedAt = new Date().toISOString();
    await this.database.recurringRules.update(id, {
      ...updates,
      updatedAt,
    });
    syncRecurringRuleToSupabase({ ...existing, ...updates, updatedAt });
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { active: false });
  }

  async ensurePlannedForCompetence(competence: string): Promise<number> {
    const { userId, workspaceId } = this.getSessionContext();
    const activeRules = await this.listActive();
    let generatedCount = 0;
    const now = new Date().toISOString();

    for (const rule of activeRules) {
      if (!isRuleActiveForCompetence(rule, competence)) continue;

      // Idempotency: check if transaction already exists for this rule + competence
      const existing = await this.database.transactions
        .where('workspaceId')
        .equals(workspaceId)
        .filter((tx) => !tx.deletedAt && tx.recurringRuleId === rule.id && tx.competence === competence)
        .first();

      if (!existing) {
        const itemDate = getRecurrenceDateForCompetence(rule.dayOfMonth, competence);
        const plannedTx: Transaction = {
          id: generateId(),
          workspaceId,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          type: rule.templateTransaction.type,
          amountCents: rule.templateTransaction.amountCents,
          description: rule.templateTransaction.description,
          categoryId: rule.templateTransaction.categoryId,
          accountId: rule.templateTransaction.accountId,
          paymentMethod: rule.templateTransaction.paymentMethod,
          date: itemDate,
          competence,
          status: 'planned',
          recurringRuleId: rule.id,
          tags: [...rule.templateTransaction.tags, 'recorrente'],
          paidBy: rule.templateTransaction.paidBy || userId,
          visibility: rule.templateTransaction.visibility || 'shared',
        };

        await this.database.transactions.add(plannedTx);
        syncTransactionToSupabase(plannedTx);
        generatedCount++;
      }
    }

    return generatedCount;
  }
}

export class LocalSettingsRepository implements ISettingsRepository {
  constructor(private database: AppDatabase = db) {}

  private getSessionContext() {
    const { userId, workspaceId } = getCurrentSession();
    if (!workspaceId || !userId) throw new Error('Sessão não inicializada');
    return { userId, workspaceId };
  }

  async getSettings(): Promise<WorkspaceSettings> {
    const { workspaceId } = this.getSessionContext();
    const settings = await this.database.settings.get(workspaceId);
    if (!settings) {
      const defaultSettings: WorkspaceSettings = {
        workspaceId,
        competenceMode: 'purchase_date',
        pinEnabled: false,
      };
      await this.database.settings.put(defaultSettings);
      return defaultSettings;
    }
    return settings;
  }

  async updateSettings(updates: Partial<WorkspaceSettings>): Promise<void> {
    const { workspaceId } = this.getSessionContext();
    const existing = await this.getSettings();
    const updated = {
      ...existing,
      ...updates,
      workspaceId,
    };
    await this.database.settings.put(updated);
    syncSettingsToSupabase(updated);
  }

  async getPreferences(): Promise<UserPreferences> {
    const { userId } = this.getSessionContext();
    const pref = await this.database.preferences.get(userId);
    if (!pref) {
      const defaultPref: UserPreferences = {
        userId,
        theme: 'dark',
        lastPaymentMethod: 'pix',
      };
      await this.database.preferences.put(defaultPref);
      return defaultPref;
    }
    return pref;
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    const { userId } = this.getSessionContext();
    const existing = await this.getPreferences();
    const updated = {
      ...existing,
      ...updates,
      userId,
    };
    await this.database.preferences.put(updated);
    syncPreferencesToSupabase(updated);
  }
}

// Singletons for app consumption
export const transactionRepository = new LocalTransactionRepository();
export const categoryRepository = new LocalCategoryRepository();
export const accountRepository = new LocalAccountRepository();
export const budgetRepository = new LocalBudgetRepository();
export const recurringRepository = new LocalRecurringRepository();
export const settingsRepository = new LocalSettingsRepository();
