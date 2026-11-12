import { create } from 'zustand';

interface SessionProfile {
  email?: string | null;
  displayName?: string | null;
}

interface SessionState {
  currentUserId: string | null;
  currentWorkspaceId: string | null;
  userEmail: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setSession: (userId: string, workspaceId: string, profile?: SessionProfile) => void;
  clearSession: () => void;
  setInitialized: (initialized: boolean) => void;
}

const STORAGE_KEY_USER = 'fecho_user_id';
const STORAGE_KEY_WS = 'fecho_workspace_id';
const STORAGE_KEY_EMAIL = 'fecho_user_email';
const STORAGE_KEY_NAME = 'fecho_user_name';

export const useSessionStore = create<SessionState>((set) => ({
  currentUserId: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_USER) : null,
  currentWorkspaceId: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_WS) : null,
  userEmail: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_EMAIL) : null,
  displayName: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_NAME) : null,
  isAuthenticated: false,
  isInitialized: false,
  setSession: (userId: string, workspaceId: string, profile?: SessionProfile) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, userId);
      localStorage.setItem(STORAGE_KEY_WS, workspaceId);
      if (profile?.email !== undefined) {
        if (profile.email) localStorage.setItem(STORAGE_KEY_EMAIL, profile.email);
        else localStorage.removeItem(STORAGE_KEY_EMAIL);
      }
      if (profile?.displayName !== undefined) {
        if (profile.displayName) localStorage.setItem(STORAGE_KEY_NAME, profile.displayName);
        else localStorage.removeItem(STORAGE_KEY_NAME);
      }
    }
    set((prev) => ({
      currentUserId: userId,
      currentWorkspaceId: workspaceId,
      userEmail: profile?.email !== undefined ? profile.email : prev.userEmail,
      displayName: profile?.displayName !== undefined ? profile.displayName : prev.displayName,
      isAuthenticated: Boolean(userId && workspaceId),
      isInitialized: true,
    }));
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_WS);
      localStorage.removeItem(STORAGE_KEY_EMAIL);
      localStorage.removeItem(STORAGE_KEY_NAME);
    }
    set({
      currentUserId: null,
      currentWorkspaceId: null,
      userEmail: null,
      displayName: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },
  setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),
}));

export function getCurrentSession() {
  const state = useSessionStore.getState();
  return {
    userId: state.currentUserId,
    workspaceId: state.currentWorkspaceId,
  };
}
