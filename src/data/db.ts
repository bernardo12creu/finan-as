import Dexie, { Table } from 'dexie';
import { RecurringRuleTemplate } from '@/shared/lib/recurrence';

export interface BaseEntity {
  id: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  currency: 'BRL';
  createdAt: string;
}

export interface LocalUser {
  id: string;
  displayName: string;
  avatarColor: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export type TransactionType = 'expense' | 'income';
export type PaymentMethod = 'pix' | 'debit' | 'credit' | 'cash' | 'boleto' | 'transfer';
export type TransactionStatus = 'confirmed' | 'planned';
export type Visibility = 'shared' | 'private';

export interface TransactionInstallment {
  groupId: string;
  number: number;
  total: number;
}

export interface Transaction extends BaseEntity {
  type: TransactionType;
  amountCents: number;
  description: string;
  categoryId: string;
  accountId: string;
  paymentMethod: PaymentMethod;
  date: string; // ISO YYYY-MM-DD
  competence: string; // YYYY-MM
  status: TransactionStatus;
  installment?: TransactionInstallment;
  recurringRuleId?: string;
  tags: string[];
  paidBy: string; // userId
  visibility: Visibility;
}

export interface Category extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  archived: boolean;
}

export type AccountKind = 'checking' | 'credit_card' | 'cash' | 'wallet';

export interface Account extends BaseEntity {
  name: string;
  kind: AccountKind;
  ownerId: string;
  closingDay?: number;
  dueDay?: number;
}

export interface Budget extends BaseEntity {
  competence: string; // YYYY-MM
  categoryId: string | null; // null represents total monthly budget
  limitCents: number;
}

export interface RecurringRule extends BaseEntity {
  templateTransaction: RecurringRuleTemplate;
  dayOfMonth: number;
  startCompetence: string;
  endCompetence?: string;
  active: boolean;
}

export interface WorkspaceSettings {
  workspaceId: string;
  competenceMode: 'purchase_date' | 'invoice_month';
  defaultAccountId?: string;
  pinEnabled: boolean;
  lastBackupAt?: string;
}

export interface UserPreferences {
  userId: string;
  theme: 'dark' | 'light';
  lastPaymentMethod?: PaymentMethod;
}

export class AppDatabase extends Dexie {
  workspaces!: Table<Workspace, string>;
  users!: Table<LocalUser, string>;
  members!: Table<WorkspaceMember, string>;
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  budgets!: Table<Budget, string>;
  recurringRules!: Table<RecurringRule, string>;
  settings!: Table<WorkspaceSettings, string>;
  preferences!: Table<UserPreferences, string>;

  constructor(dbName = 'fecho_db') {
    super(dbName);

    // Schema version 1 with compound indices
    this.version(1).stores({
      workspaces: 'id, createdAt',
      users: 'id',
      members: 'id, workspaceId, userId, [workspaceId+userId]',
      transactions:
        'id, workspaceId, categoryId, accountId, date, competence, status, recurringRuleId, paidBy, deletedAt, [workspaceId+competence], [workspaceId+categoryId], [workspaceId+date], [workspaceId+recurringRuleId+competence], [workspaceId+deletedAt]',
      categories: 'id, workspaceId, type, archived, deletedAt, [workspaceId+deletedAt], [workspaceId+type]',
      accounts: 'id, workspaceId, kind, deletedAt, [workspaceId+deletedAt], [workspaceId+kind]',
      budgets: 'id, workspaceId, competence, categoryId, deletedAt, [workspaceId+competence], [workspaceId+competence+categoryId]',
      recurringRules: 'id, workspaceId, active, deletedAt, [workspaceId+deletedAt], [workspaceId+active]',
      settings: 'workspaceId',
      preferences: 'userId',
    });
  }
}

export const db = new AppDatabase();
