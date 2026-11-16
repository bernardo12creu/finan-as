import {
  db,
  Transaction,
  Category,
  Account,
  Budget,
  RecurringRule,
  WorkspaceSettings,
  UserPreferences,
} from './db';
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabaseClient';
import { RecurringRuleTemplate } from '@/shared/lib/recurrence';

function isSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.MODE === 'test') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function hasActiveAuthSession(): Promise<boolean> {
  if (!isSyncEnabled()) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.access_token);
  } catch {
    return false;
  }
}

async function upsertRows(table: string, payload: unknown, onConflict: string): Promise<void> {
  if (!(await hasActiveAuthSession())) return;
  try {
    await supabase.from(table).upsert(payload as Record<string, unknown>, { onConflict });
  } catch {
    // Offline or network error: local IndexedDB remains source of truth
  }
}

export function syncTransactionToSupabase(tx: Transaction | Transaction[]): void {
  const list = Array.isArray(tx) ? tx : [tx];
  const rows = list.map((item) => ({
    id: item.id,
    workspace_id: item.workspaceId,
    created_by: item.createdBy,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
    type: item.type,
    amount_cents: item.amountCents,
    description: item.description,
    category_id: item.categoryId,
    account_id: item.accountId,
    payment_method: item.paymentMethod,
    date: item.date,
    competence: item.competence,
    status: item.status,
    installment: item.installment ?? null,
    recurring_rule_id: item.recurringRuleId ?? null,
    tags: item.tags,
    paid_by: item.paidBy,
    visibility: item.visibility,
  }));
  void upsertRows('transactions', rows, 'id');
}

export function syncCategoryToSupabase(cat: Category | Category[]): void {
  const list = Array.isArray(cat) ? cat : [cat];
  const rows = list.map((c) => ({
    id: c.id,
    workspace_id: c.workspaceId,
    created_by: c.createdBy,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: c.deletedAt ?? null,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
    archived: c.archived,
  }));
  void upsertRows('categories', rows, 'id');
}

export function syncAccountToSupabase(acc: Account | Account[]): void {
  const list = Array.isArray(acc) ? acc : [acc];
  const rows = list.map((a) => ({
    id: a.id,
    workspace_id: a.workspaceId,
    created_by: a.createdBy,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt ?? null,
    name: a.name,
    kind: a.kind,
    owner_id: a.ownerId,
    closing_day: a.closingDay ?? null,
    due_day: a.dueDay ?? null,
  }));
  void upsertRows('accounts', rows, 'id');
}

export function syncBudgetToSupabase(b: Budget | Budget[]): void {
  const list = Array.isArray(b) ? b : [b];
  if (list.length === 0) return;
  const rows = list.map((item) => ({
    id: item.id,
    workspace_id: item.workspaceId,
    created_by: item.createdBy,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
    competence: item.competence,
    category_id: item.categoryId,
    limit_cents: item.limitCents,
  }));
  void upsertRows('budgets', rows, 'id');
}

export function syncRecurringRuleToSupabase(r: RecurringRule | RecurringRule[]): void {
  const list = Array.isArray(r) ? r : [r];
  if (list.length === 0) return;
  const rows = list.map((item) => ({
    id: item.id,
    workspace_id: item.workspaceId,
    created_by: item.createdBy,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
    template_transaction: item.templateTransaction,
    day_of_month: item.dayOfMonth,
    start_competence: item.startCompetence,
    end_competence: item.endCompetence ?? null,
    active: item.active,
  }));
  void upsertRows('recurring_rules', rows, 'id');
}

/**
 * Non-destructive bidirectional merge by `updatedAt`:
 * - Keeps local-only records and pushes them to Supabase so offline/unsynced edits are never lost.
 * - Preserves newer local edits when `local.updatedAt > remote.updatedAt` and pushes them to Supabase.
 * - Applies remote updates locally when `remote.updatedAt >= local.updatedAt` or missing locally.
 */
export function mergeByUpdatedAt<T extends { id: string; updatedAt: string }>(
  localItems: T[],
  remoteItems: T[]
): { toSaveLocally: T[]; toPushRemotely: T[] } {
  const localMap = new Map(localItems.map((item) => [item.id, item]));
  const remoteMap = new Map(remoteItems.map((item) => [item.id, item]));

  const toSaveLocally: T[] = [];
  const toPushRemotely: T[] = [];

  for (const remote of remoteItems) {
    const local = localMap.get(remote.id);
    if (!local || remote.updatedAt >= local.updatedAt) {
      toSaveLocally.push(remote);
    } else {
      toPushRemotely.push(local);
    }
  }

  for (const local of localItems) {
    if (!remoteMap.has(local.id)) {
      toPushRemotely.push(local);
    }
  }

  return { toSaveLocally, toPushRemotely };
}

export function syncSettingsToSupabase(s: WorkspaceSettings): void {
  void upsertRows(
    'workspace_settings',
    {
      workspace_id: s.workspaceId,
      competence_mode: s.competenceMode,
      default_account_id: s.defaultAccountId ?? null,
      pin_enabled: s.pinEnabled,
      last_backup_at: s.lastBackupAt ?? null,
      updated_at: new Date().toISOString(),
    },
    'workspace_id'
  );
}

export function syncPreferencesToSupabase(p: UserPreferences): void {
  void upsertRows(
    'user_preferences',
    {
      user_id: p.userId,
      theme: p.theme,
      last_payment_method: p.lastPaymentMethod ?? null,
      updated_at: new Date().toISOString(),
    },
    'user_id'
  );
}

export async function pullWorkspaceFromSupabase(
  workspaceId: string,
  userId?: string
): Promise<void> {
  if (!(await hasActiveAuthSession())) return;

  try {
    interface RemoteCategory {
      id: string;
      workspace_id: string;
      created_by: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      name: string;
      icon: string;
      color: string;
      type: 'expense' | 'income';
      archived: boolean;
    }

    interface RemoteAccount {
      id: string;
      workspace_id: string;
      created_by: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      name: string;
      kind: 'checking' | 'credit_card' | 'cash' | 'wallet';
      owner_id: string;
      closing_day: number | null;
      due_day: number | null;
    }

    interface RemoteTransaction {
      id: string;
      workspace_id: string;
      created_by: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      type: 'expense' | 'income';
      amount_cents: number;
      description: string;
      category_id: string;
      account_id: string;
      payment_method: 'pix' | 'debit' | 'credit' | 'cash' | 'boleto' | 'transfer';
      date: string;
      competence: string;
      status: 'confirmed' | 'planned';
      installment: { groupId: string; number: number; total: number } | null;
      recurring_rule_id: string | null;
      tags: string[];
      paid_by: string;
      visibility: 'shared' | 'private';
    }

    interface RemoteBudget {
      id: string;
      workspace_id: string;
      created_by: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      competence: string;
      category_id: string | null;
      limit_cents: number;
    }

    interface RemoteRecurringRule {
      id: string;
      workspace_id: string;
      created_by: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
      template_transaction: RecurringRuleTemplate;
      day_of_month: number;
      start_competence: string;
      end_competence: string | null;
      active: boolean;
    }

    interface RemoteSettings {
      workspace_id: string;
      competence_mode: 'purchase_date' | 'invoice_month';
      default_account_id: string | null;
      pin_enabled: boolean;
      last_backup_at: string | null;
    }

    interface RemotePreferences {
      user_id: string;
      theme: 'dark' | 'light';
      last_payment_method: 'pix' | 'debit' | 'credit' | 'cash' | 'boleto' | 'transfer' | null;
    }

    const [catsRes, accsRes, txsRes, budgetsRes, rulesRes, settingsRes, prefsRes] =
      await Promise.all([
        supabase.from('categories').select('*').eq('workspace_id', workspaceId),
        supabase.from('accounts').select('*').eq('workspace_id', workspaceId),
        supabase.from('transactions').select('*').eq('workspace_id', workspaceId),
        supabase.from('budgets').select('*').eq('workspace_id', workspaceId),
        supabase.from('recurring_rules').select('*').eq('workspace_id', workspaceId),
        supabase.from('workspace_settings').select('*').eq('workspace_id', workspaceId).maybeSingle(),
        userId
          ? supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const remoteCats = (catsRes.data ?? []) as RemoteCategory[];
    const remoteAccs = (accsRes.data ?? []) as RemoteAccount[];
    const remoteTxs = (txsRes.data ?? []) as RemoteTransaction[];
    const remoteBudgets = (budgetsRes.data ?? []) as RemoteBudget[];
    const remoteRules = (rulesRes.data ?? []) as RemoteRecurringRule[];
    const remoteSettings = settingsRes.data as RemoteSettings | null;
    const remotePrefs = prefsRes.data as RemotePreferences | null;

    const [localCats, localAccs, localTxs, localBudgets, localRules] = await Promise.all([
      db.categories.where('workspaceId').equals(workspaceId).toArray(),
      db.accounts.where('workspaceId').equals(workspaceId).toArray(),
      db.transactions.where('workspaceId').equals(workspaceId).toArray(),
      db.budgets.where('workspaceId').equals(workspaceId).toArray(),
      db.recurringRules.where('workspaceId').equals(workspaceId).toArray(),
    ]);

    const mappedRemoteCats: Category[] = remoteCats.map((c) => ({
      id: c.id,
      workspaceId: c.workspace_id,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      deletedAt: c.deleted_at ?? undefined,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type,
      archived: c.archived,
    }));
    const catMerge = mergeByUpdatedAt(localCats, mappedRemoteCats);
    if (catMerge.toSaveLocally.length > 0) {
      await db.categories.bulkPut(catMerge.toSaveLocally);
    }
    if (catMerge.toPushRemotely.length > 0) {
      syncCategoryToSupabase(catMerge.toPushRemotely);
    }

    const mappedRemoteAccs: Account[] = remoteAccs.map((a) => ({
      id: a.id,
      workspaceId: a.workspace_id,
      createdBy: a.created_by,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      deletedAt: a.deleted_at ?? undefined,
      name: a.name,
      kind: a.kind,
      ownerId: a.owner_id,
      closingDay: a.closing_day ?? undefined,
      dueDay: a.due_day ?? undefined,
    }));
    const accMerge = mergeByUpdatedAt(localAccs, mappedRemoteAccs);
    if (accMerge.toSaveLocally.length > 0) {
      await db.accounts.bulkPut(accMerge.toSaveLocally);
    }
    if (accMerge.toPushRemotely.length > 0) {
      syncAccountToSupabase(accMerge.toPushRemotely);
    }

    const mappedRemoteTxs: Transaction[] = remoteTxs.map((t) => ({
      id: t.id,
      workspaceId: t.workspace_id,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      deletedAt: t.deleted_at ?? undefined,
      type: t.type,
      amountCents: Number(t.amount_cents),
      description: t.description,
      categoryId: t.category_id,
      accountId: t.account_id,
      paymentMethod: t.payment_method,
      date: t.date,
      competence: t.competence,
      status: t.status,
      installment: t.installment ?? undefined,
      recurringRuleId: t.recurring_rule_id ?? undefined,
      tags: t.tags ?? [],
      paidBy: t.paid_by,
      visibility: t.visibility,
    }));
    const txMerge = mergeByUpdatedAt(localTxs, mappedRemoteTxs);
    if (txMerge.toSaveLocally.length > 0) {
      await db.transactions.bulkPut(txMerge.toSaveLocally);
    }
    if (txMerge.toPushRemotely.length > 0) {
      syncTransactionToSupabase(txMerge.toPushRemotely);
    }

    const mappedRemoteBudgets: Budget[] = remoteBudgets.map((b) => ({
      id: b.id,
      workspaceId: b.workspace_id,
      createdBy: b.created_by,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      deletedAt: b.deleted_at ?? undefined,
      competence: b.competence,
      categoryId: b.category_id,
      limitCents: Number(b.limit_cents),
    }));
    const budgetMerge = mergeByUpdatedAt(localBudgets, mappedRemoteBudgets);
    if (budgetMerge.toSaveLocally.length > 0) {
      await db.budgets.bulkPut(budgetMerge.toSaveLocally);
    }
    if (budgetMerge.toPushRemotely.length > 0) {
      syncBudgetToSupabase(budgetMerge.toPushRemotely);
    }

    const mappedRemoteRules: RecurringRule[] = remoteRules.map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at ?? undefined,
      templateTransaction: r.template_transaction,
      dayOfMonth: r.day_of_month,
      startCompetence: r.start_competence,
      endCompetence: r.end_competence ?? undefined,
      active: r.active,
    }));
    const ruleMerge = mergeByUpdatedAt(localRules, mappedRemoteRules);
    if (ruleMerge.toSaveLocally.length > 0) {
      await db.recurringRules.bulkPut(ruleMerge.toSaveLocally);
    }
    if (ruleMerge.toPushRemotely.length > 0) {
      syncRecurringRuleToSupabase(ruleMerge.toPushRemotely);
    }

    if (remoteSettings) {
      await db.settings.put({
        workspaceId: remoteSettings.workspace_id,
        competenceMode: remoteSettings.competence_mode,
        defaultAccountId: remoteSettings.default_account_id ?? undefined,
        pinEnabled: remoteSettings.pin_enabled,
        lastBackupAt: remoteSettings.last_backup_at ?? undefined,
      });
    }

    if (remotePrefs) {
      await db.preferences.put({
        userId: remotePrefs.user_id,
        theme: remotePrefs.theme,
        lastPaymentMethod: remotePrefs.last_payment_method ?? undefined,
      });
    }
  } catch {
    // Offline fallback
  }
}
