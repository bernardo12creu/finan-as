import type { User } from '@supabase/supabase-js';
import { db, Category, Account } from '@/data/db';
import { useSessionStore } from '@/data/session';
import { supabase } from '@/data/supabaseClient';
import { pullWorkspaceFromSupabase } from '@/data/supabaseSync';

export const DEFAULT_CATEGORIES: Array<{
  slug: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}> = [
  { slug: 'cat_moradia', name: 'Moradia', icon: 'Home', color: '#3B82F6', type: 'expense' },
  { slug: 'cat_mercado', name: 'Mercado', icon: 'ShoppingCart', color: '#10B981', type: 'expense' },
  {
    slug: 'cat_alimentacao',
    name: 'Alimentação fora',
    icon: 'Utensils',
    color: '#F59E0B',
    type: 'expense',
  },
  { slug: 'cat_transporte', name: 'Transporte', icon: 'Car', color: '#6366F1', type: 'expense' },
  { slug: 'cat_saude', name: 'Saúde', icon: 'HeartPulse', color: '#EC4899', type: 'expense' },
  {
    slug: 'cat_educacao',
    name: 'Educação',
    icon: 'GraduationCap',
    color: '#8B5CF6',
    type: 'expense',
  },
  { slug: 'cat_lazer', name: 'Lazer', icon: 'Gamepad2', color: '#06B6D4', type: 'expense' },
  { slug: 'cat_assinaturas', name: 'Assinaturas', icon: 'Tv', color: '#F97316', type: 'expense' },
  { slug: 'cat_compras', name: 'Compras', icon: 'ShoppingBag', color: '#EAB308', type: 'expense' },
  { slug: 'cat_pets', name: 'Pets', icon: 'PawPrint', color: '#14B8A6', type: 'expense' },
  {
    slug: 'cat_impostos',
    name: 'Impostos/Taxas',
    icon: 'Landmark',
    color: '#64748B',
    type: 'expense',
  },
  { slug: 'cat_outros', name: 'Outros', icon: 'MoreHorizontal', color: '#71717A', type: 'expense' },
  { slug: 'cat_salario', name: 'Salário', icon: 'Briefcase', color: '#22C55E', type: 'income' },
  {
    slug: 'cat_outras_receitas',
    name: 'Outras receitas',
    icon: 'Wallet',
    color: '#4ADE80',
    type: 'income',
  },
];

function extractDisplayName(authUser: User): string {
  const meta = authUser.user_metadata as Record<string, unknown> | undefined;
  const candidate =
    (typeof meta?.display_name === 'string' && meta.display_name.trim()) ||
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (authUser.email ? authUser.email.split('@')[0] : '') ||
    'Usuário';
  return candidate;
}

export async function bootstrapForAuthUser(
  authUser: User
): Promise<{ userId: string; workspaceId: string }> {
  const now = new Date().toISOString();
  const userId = authUser.id;
  let workspaceId = `ws_${userId}`;
  let displayName = extractDisplayName(authUser);
  const email = authUser.email ?? null;

  // Provision or load workspace on Supabase when online
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      const { data, error } = await supabase.rpc('ensure_user_workspace', {
        p_display_name: displayName,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        const row = data[0] as {
          user_id?: string;
          workspace_id?: string;
          display_name?: string;
        };
        if (row.workspace_id) workspaceId = row.workspace_id;
        if (row.display_name) displayName = row.display_name;
      }
    } catch {
      // Offline fallback uses deterministic local defaults
    }
  }

  // Ensure local Dexie workspace & profile mirror exist (isolated strictly per workspaceId)
  const existingWorkspace = await db.workspaces.get(workspaceId);
  if (!existingWorkspace) {
    await db.workspaces.put({
      id: workspaceId,
      name: 'Minhas finanças',
      currency: 'BRL',
      createdAt: now,
    });
  }

  await db.users.put({
    id: userId,
    displayName,
    avatarColor: '#22C55E',
  });

  await db.members.put({
    id: `${workspaceId}__mem_${userId}`,
    workspaceId,
    userId,
    role: 'owner',
    joinedAt: now,
  });

  const existingSettings = await db.settings.get(workspaceId);
  if (!existingSettings) {
    await db.settings.put({
      workspaceId,
      competenceMode: 'purchase_date',
      pinEnabled: false,
    });
  }

  const existingPref = await db.preferences.get(userId);
  if (!existingPref) {
    await db.preferences.put({
      userId,
      theme: 'dark',
      lastPaymentMethod: 'pix',
    });
  }

  // Update session store BEFORE pulling cloud state
  useSessionStore.getState().setSession(userId, workspaceId, { email, displayName });

  // Pull cloud records for this user's workspace
  await pullWorkspaceFromSupabase(workspaceId, userId);

  // If still no local categories/accounts (e.g. offline first sign-in), seed workspace-scoped defaults locally
  const localCatCount = await db.categories.where('workspaceId').equals(workspaceId).count();
  if (localCatCount === 0) {
    const categoriesToInsert: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
      id: `${workspaceId}__${cat.slug}`,
      workspaceId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      archived: false,
    }));
    await db.categories.bulkPut(categoriesToInsert);
  }

  const localAccCount = await db.accounts.where('workspaceId').equals(workspaceId).count();
  if (localAccCount === 0) {
    const defaultAccounts: Account[] = [
      {
        id: `${workspaceId}__acc_checking_main`,
        workspaceId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        name: 'Conta Corrente',
        kind: 'checking',
        ownerId: userId,
      },
      {
        id: `${workspaceId}__acc_credit_main`,
        workspaceId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        name: 'Cartão de Crédito',
        kind: 'credit_card',
        ownerId: userId,
        closingDay: 25,
        dueDay: 5,
      },
      {
        id: `${workspaceId}__acc_wallet_main`,
        workspaceId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        name: 'Carteira / Dinheiro',
        kind: 'cash',
        ownerId: userId,
      },
    ];
    await db.accounts.bulkPut(defaultAccounts);
  }

  return { userId, workspaceId };
}

export async function signOutAndClearLocal(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Still wipe local session on offline logout
  }

  await Promise.all([
    db.transactions.clear(),
    db.categories.clear(),
    db.accounts.clear(),
    db.budgets.clear(),
    db.recurringRules.clear(),
    db.settings.clear(),
    db.preferences.clear(),
    db.workspaces.clear(),
    db.users.clear(),
    db.members.clear(),
  ]);

  useSessionStore.getState().clearSession();
}
