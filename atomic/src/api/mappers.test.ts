import { describe, it, expect } from 'vitest';
import { keysToSnake, keysToCamel, goalPatchToApi, mapProfileFromApi, mapReviewFromApi } from './mappers';

describe('keysToSnake / keysToCamel', () => {
  it('converts flat object keys', () => {
    const s = keysToSnake({ finalGoal: 'x', totalCheckinDays: 1 });
    expect(s).toEqual({ final_goal: 'x', total_checkin_days: 1 });
    const c = keysToCamel(s);
    expect(c).toEqual({ finalGoal: 'x', totalCheckinDays: 1 });
  });

  it('keeps null and undefined handling', () => {
    expect(keysToSnake(null)).toBeNull();
    expect(keysToCamel(undefined)).toBeUndefined();
  });
});

describe('goalPatchToApi', () => {
  it('snake-cases reviewReminderEnabled', () => {
    const out = goalPatchToApi({ reviewReminderEnabled: true });
    expect(out).toEqual({ review_reminder_enabled: true });
  });
});

describe('mapProfileFromApi', () => {
  it('maps stats nested in API payload', () => {
    const p = mapProfileFromApi({
      nickname: 'a',
      badges: [],
      stats: { total_checkin_days: 5, fixed_habits_count: 2 },
    });
    expect(p.totalCheckinDays).toBe(5);
    expect(p.fixedHabitsCount).toBe(2);
  });
});

describe('mapReviewFromApi', () => {
  it('maps metrics from snake case', () => {
    const r = mapReviewFromApi({
      id: '1',
      type: 'manual',
      title: 't',
      date: '2026-01-01',
      is_favorite: true,
      metrics: {
        checkin_rate: 0.8,
        avg_duration: 10,
        missed_days: 1,
        progress_delta: 2,
        total_minutes: 100,
      },
    });
    expect(r.isFavorite).toBe(true);
    expect(r.metrics?.checkinRate).toBe(0.8);
    expect(r.metrics?.totalMinutes).toBe(100);
  });
});
