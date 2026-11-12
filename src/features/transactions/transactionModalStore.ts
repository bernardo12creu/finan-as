import { create } from 'zustand';
import { Transaction } from '@/data/db';

interface TransactionModalState {
  isOpen: boolean;
  editingTransaction?: Transaction | null;
  openCreate: (defaultType?: 'expense' | 'income') => void;
  openEdit: (transaction: Transaction) => void;
  close: () => void;
  defaultType: 'expense' | 'income';
}

export const useTransactionModalStore = create<TransactionModalState>((set) => ({
  isOpen: false,
  editingTransaction: null,
  defaultType: 'expense',
  openCreate: (defaultType = 'expense') =>
    set({ isOpen: true, editingTransaction: null, defaultType }),
  openEdit: (transaction) =>
    set({ isOpen: true, editingTransaction: transaction, defaultType: transaction.type }),
  close: () => set({ isOpen: false, editingTransaction: null }),
}));
