import { useLiveQuery } from 'dexie-react-hooks';
import { Transaction, Category, Account, Budget, RecurringRule, WorkspaceSettings } from '@/data/db';
import { useSessionStore } from '@/data/session';
import {
  transactionRepository,
  categoryRepository,
  accountRepository,
  budgetRepository,
  recurringRepository,
  settingsRepository,
} from './repositories/local/localRepository';
import { TransactionFilters } from './repositories/interfaces';

export function useTransactions(filters?: TransactionFilters) {
  const { currentWorkspaceId } = useSessionStore();

  const transactions = useLiveQuery(
    async () => {
      if (!currentWorkspaceId) return [] as Transaction[];
      return transactionRepository.list(filters);
    },
    [
      currentWorkspaceId,
      filters?.competence,
      filters?.categoryId,
      filters?.accountId,
      filters?.paymentMethod,
      filters?.type,
      filters?.status,
      filters?.search,
      filters?.paidBy,
    ],
    []
  );

  return {
    transactions: transactions ?? [],
    repository: transactionRepository,
  };
}

export function useCategories(type?: 'expense' | 'income') {
  const { currentWorkspaceId } = useSessionStore();

  const categories = useLiveQuery(
    async () => {
      if (!currentWorkspaceId) return [] as Category[];
      return categoryRepository.list(type);
    },
    [currentWorkspaceId, type],
    []
  );

  return {
    categories: categories ?? [],
    repository: categoryRepository,
  };
}

export function useAccounts() {
  const { currentWorkspaceId } = useSessionStore();

  const accounts = useLiveQuery(
    async () => {
      if (!currentWorkspaceId) return [] as Account[];
      return accountRepository.list();
    },
    [currentWorkspaceId],
    []
  );

  return {
    accounts: accounts ?? [],
    repository: accountRepository,
  };
}

export function useBudgets(competence: string) {
  const { currentWorkspaceId } = useSessionStore();

  const budgets = useLiveQuery(
    async () => {
      if (!currentWorkspaceId) return [] as Budget[];
      return budgetRepository.listByCompetence(competence);
    },
    [currentWorkspaceId, competence],
    []
  );

  return {
    budgets: budgets ?? [],
    repository: budgetRepository,
  };
}

export function useRecurringRules() {
  const { currentWorkspaceId } = useSessionStore();

  const rules = useLiveQuery(
    async () => {
      if (!currentWorkspaceId) return [] as RecurringRule[];
      return recurringRepository.listActive();
    },
    [currentWorkspaceId],
    []
  );

  return {
    rules: rules ?? [],
    repository: recurringRepository,
  };
}

export function useWorkspaceSettings() {
  const { currentWorkspaceId } = useSessionStore();

  const settings = useLiveQuery(
    async () => {
      if (!currentWorkspaceId) return null as WorkspaceSettings | null;
      return settingsRepository.getSettings();
    },
    [currentWorkspaceId],
    null
  );

  return {
    settings,
    repository: settingsRepository,
  };
}

export function useUpcomingPlanned(daysAhead = 7) {
  const { currentWorkspaceId } = useSessionStore();

  const upcoming = useLiveQuery(
    async () => {
      if (!currentWorkspaceId) return [] as Transaction[];
      return transactionRepository.getUpcomingPlanned(daysAhead);
    },
    [currentWorkspaceId, daysAhead],
    []
  );

  return {
    upcoming: upcoming ?? [],
  };
}
