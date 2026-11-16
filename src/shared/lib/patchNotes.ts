import { create } from 'zustand';

export const PATCH_NOTES_VERSION = '2026-11-v15';
export const PATCH_NOTES_STORAGE_KEY = 'fecho_patch_notes_state_v1';
export const PATCH_NOTES_MAX_DAYS = 3;

export interface PatchNotesSeenState {
  version: string;
  shownDates: string[]; // Unique 'YYYY-MM-DD' strings
}

function getUniqueDates(dates: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const d of dates) {
    const clean = d.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      unique.push(clean);
    }
  }
  return unique;
}

export function shouldShowPatchNotes(
  todayStr: string,
  state: PatchNotesSeenState | null,
  currentVersion = PATCH_NOTES_VERSION
): boolean {
  if (!state || state.version !== currentVersion) {
    return true;
  }

  const uniqueDates = getUniqueDates(state.shownDates || []);
  if (uniqueDates.includes(todayStr)) {
    return false;
  }

  if (uniqueDates.length >= PATCH_NOTES_MAX_DAYS) {
    return false;
  }

  return true;
}

export function recordPatchNotesShown(
  todayStr: string,
  state: PatchNotesSeenState | null,
  currentVersion = PATCH_NOTES_VERSION
): PatchNotesSeenState {
  if (!state || state.version !== currentVersion) {
    return {
      version: currentVersion,
      shownDates: [todayStr],
    };
  }

  const nextDates = getUniqueDates([...(state.shownDates || []), todayStr]).slice(
    0,
    PATCH_NOTES_MAX_DAYS
  );

  return {
    version: currentVersion,
    shownDates: nextDates,
  };
}

export function loadPatchNotesState(): PatchNotesSeenState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PATCH_NOTES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PatchNotesSeenState>;
    if (typeof parsed.version !== 'string' || !Array.isArray(parsed.shownDates)) {
      return null;
    }
    return {
      version: parsed.version,
      shownDates: parsed.shownDates.filter((d): d is string => typeof d === 'string'),
    };
  } catch {
    return null;
  }
}

export function savePatchNotesState(state: PatchNotesSeenState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PATCH_NOTES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota / private mode errors
  }
}

interface PatchNotesModalStore {
  isOpen: boolean;
  shownDayNumber: number;
  openManual: () => void;
  checkAndOpenForToday: (todayStr: string) => void;
  close: () => void;
}

export const usePatchNotesModalStore = create<PatchNotesModalStore>((set) => ({
  isOpen: false,
  shownDayNumber: 1,

  openManual: () => {
    const state = loadPatchNotesState();
    const count =
      state && state.version === PATCH_NOTES_VERSION
        ? getUniqueDates(state.shownDates).length
        : 1;
    set({
      isOpen: true,
      shownDayNumber: Math.min(PATCH_NOTES_MAX_DAYS, Math.max(1, count)),
    });
  },

  checkAndOpenForToday: (todayStr: string) => {
    const current = loadPatchNotesState();
    if (!shouldShowPatchNotes(todayStr, current)) {
      return;
    }
    const next = recordPatchNotesShown(todayStr, current);
    savePatchNotesState(next);
    set({
      isOpen: true,
      shownDayNumber: Math.min(PATCH_NOTES_MAX_DAYS, Math.max(1, next.shownDates.length)),
    });
  },

  close: () => set({ isOpen: false }),
}));
