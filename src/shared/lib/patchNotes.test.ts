import { describe, it, expect } from 'vitest';
import {
  PATCH_NOTES_VERSION,
  PatchNotesSeenState,
  shouldShowPatchNotes,
  recordPatchNotesShown,
} from './patchNotes';

describe('patch notes 1x/day for 3 days scheduling', () => {
  it('shows once per day across 3 distinct days and stops from day 4 onward', () => {
    let state: PatchNotesSeenState | null = null;

    // Day 1: first entry -> shows
    expect(shouldShowPatchNotes('2026-11-16', state)).toBe(true);
    state = recordPatchNotesShown('2026-11-16', state);
    expect(state.shownDates).toEqual(['2026-11-16']);
    // Day 1: second entry same day -> hidden
    expect(shouldShowPatchNotes('2026-11-16', state)).toBe(false);

    // Day 2: first entry -> shows
    expect(shouldShowPatchNotes('2026-11-17', state)).toBe(true);
    state = recordPatchNotesShown('2026-11-17', state);
    expect(state.shownDates).toEqual(['2026-11-16', '2026-11-17']);
    // Day 2: second entry same day -> hidden
    expect(shouldShowPatchNotes('2026-11-17', state)).toBe(false);

    // Day 3: first entry -> shows
    expect(shouldShowPatchNotes('2026-11-18', state)).toBe(true);
    state = recordPatchNotesShown('2026-11-18', state);
    expect(state.shownDates).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    // Day 3: second entry same day -> hidden
    expect(shouldShowPatchNotes('2026-11-18', state)).toBe(false);

    // Day 4 -> hidden permanently for this version
    expect(shouldShowPatchNotes('2026-11-19', state)).toBe(false);
    expect(shouldShowPatchNotes('2026-11-25', state)).toBe(false);
  });

  it('resets and shows again for 3 days when patch notes version bumps', () => {
    const oldVersionState: PatchNotesSeenState = {
      version: '2026-11-v14',
      shownDates: ['2026-11-13', '2026-11-14', '2026-11-15'],
    };

    expect(shouldShowPatchNotes('2026-11-16', oldVersionState, PATCH_NOTES_VERSION)).toBe(true);
    const updated = recordPatchNotesShown('2026-11-16', oldVersionState, PATCH_NOTES_VERSION);
    expect(updated).toEqual({
      version: PATCH_NOTES_VERSION,
      shownDates: ['2026-11-16'],
    });
  });
});
