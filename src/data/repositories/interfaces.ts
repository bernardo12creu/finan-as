import {
  Transaction,
  Category,
  Account,
  Budget,
  RecurringRule,
  WorkspaceSettings,
  UserPreferences,
  TransactionType,
  PaymentMethod,
  TransactionStatus,
} from '@/data/db';

export interface CreateTransactionDTO {
  type: TransactionType;
  amountCents: number;
  description: string;
  categoryId: string;
  accountId: string;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  competence?: string; // YYYY-MM (optional: calculated if omitted)
  status?: TransactionStatus;
  installment?: {
    groupId: string;
    number: number;
    total: number;
  };
  recurringRuleId?: string;
  tags?: string[];
  paidBy?: string;
  visibility?: 'shared' | 'private';
}

export interface UpdateTransactionDTO extends Partial<CreateTransactionDTO> {
  id: string;
}

export interface TransactionFilters {
  competence?: string;
  categoryId?: string;
  accountId?: string;
  paymentMethod?: PaymentMethod;
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
  paidBy?: string;
}

export interface ITransactionRepository {
  list(filters?: TransactionFilters): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | undefined>;
  create(dto: CreateTransactionDTO): Promise<Transaction>;
  createMany(dtos: CreateTransactionDTO[]): Promise<Transaction[]>;
  update(id: string, updates: Partial<Transaction>): Promise<void>;
  softDelete(id: string): Promise<void>;
  softDeleteGroup(groupId: string, fromInstallmentNumber?: number): Promise<void>;
  restore(id: string): Promise<void>;
  getUpcomingPlanned(daysAhead: number): Promise<Transaction[]>;
}

export interface ICategoryRepository {
  list(type?: TransactionType): Promise<Category[]>;
  getById(id: string): Promise<Category | undefined>;
  create(category: Omit<Category, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  update(id: string, updates: Partial<Category>): Promise<void>;
  archive(id: string): Promise<void>;
}

export interface IAccountRepository {
  list(): Promise<Account[]>;
  getById(id: string): Promise<Account | undefined>;
  create(account: Omit<Account, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Account>;
  update(id: string, updates: Partial<Account>): Promise<void>;
  archive(id: string): Promise<void>;
}

export interface IBudgetRepository {
  listByCompetence(competence: string): Promise<Budget[]>;
  getTotalBudget(competence: string): Promise<Budget | undefined>;
  setBudget(competence: string, categoryId: string | null, limitCents: number): Promise<Budget>;
  copyBudgetsFromPreviousMonth(targetCompetence: string): Promise<number>;
}

export interface IRecurringRepository {
  listActive(): Promise<RecurringRule[]>;
  getById(id: string): Promise<RecurringRule | undefined>;
  create(rule: Omit<RecurringRule, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<RecurringRule>;
  update(id: string, updates: Partial<RecurringRule>): Promise<void>;
  deactivate(id: string): Promise<void>;
  ensurePlannedForCompetence(competence: string): Promise<number>;
}

export interface ISettingsRepository {
  getSettings(): Promise<WorkspaceSettings>;
  updateSettings(updates: Partial<WorkspaceSettings>): Promise<void>;
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(updates: Partial<UserPreferences>): Promise<void>;
}
