import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 5000;

    // Haptic feedback if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // ignore if not allowed by browser
      }
    }

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function showToast(toast: Omit<ToastItem, 'id'>) {
  return useToastStore.getState().showToast(toast);
}
