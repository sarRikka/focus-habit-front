/**
 * API 与前端模型之间的键名转换
 * 后端：snake_case；前端：camelCase
 */

import type { Goal, AppSettings, UserProfile, ReviewReport, SpecialScene, CheckinRecord, PhaseTask, RewardStage, DailyHabit } from '../types';
import { uid, clampProgressDeduction, clamp } from '../composables/utils';

function toSnakeKey(s: string): string {
  return s.replace(/([A-Z])/g, m => `_${m.toLowerCase()}`);
}

export function keysToSnake<T = unknown>(input: unknown): T {
  if (input === null || input === undefined) return input as T;
  if (Array.isArray(input)) return input.map(x => keysToSnake(x)) as T;
  if (typeof input !== 'object') return input as T;
  if (input instanceof Date) return input as T;
  const o = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    out[toSnakeKey(k)] = keysToSnake(v);
  }
  return out as T;
}

export function keysToCamel<T = unknown>(input: unknown): T {
  if (input === null || input === undefined) return input as T;
  if (Array.isArray(input)) return input.map(x => keysToCamel(x)) as T;
  if (typeof input !== 'object') return input as T;
  if (input instanceof Date) return input as T;
  const o = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = keysToCamel(v);
  }
  return out as T;
}

function mapCheckins(raw: unknown): Record<string, CheckinRecord> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const m: Record<string, CheckinRecord> = {};
    (keysToCamel(raw) as CheckinRecord[]).forEach((c) => {
      if (c?.date) m[c.date] = c;
    });
    return m;
  }
  if (typeof raw === 'object') return raw as Record<string, CheckinRecord>;
  return {};
}

/** 将 API 返回的任意 Goal 形对象稳定为前端 Goal */
export function mapGoalFromApi(input: unknown): Goal {
  const o = keysToCamel<Record<string, unknown>>(input) as unknown as Record<string, unknown>;
  const daily = (o.dailyHabit || o.daily_habit) as Record<string, unknown> | undefined;
  const dailyHabit: DailyHabit = {
    description: String(daily?.description ?? ''),
    duration: Math.max(1, Number(daily?.duration ?? 30)),
    autoLevelUp: Boolean(daily?.autoLevelUp ?? daily?.auto_level_up ?? false),
    levelUpStep: Math.max(1, Number(daily?.levelUpStep ?? daily?.level_up_step ?? 1)),
    daysPerWeek: (() => {
      const raw = Number(daily?.daysPerWeek ?? daily?.days_per_week ?? 7);
      return Number.isFinite(raw) ? clamp(raw, 1, 7) : 7;
    })(),
  };
  const phasesIn = (o.phases as PhaseTask[] | undefined) ?? [];
  const phases: PhaseTask[] = (Array.isArray(phasesIn) ? phasesIn : []).map((p) => ({
    id: String((p as PhaseTask).id || uid('p')),
    name: (p as PhaseTask).name || '',
    description: (p as PhaseTask).description || '',
    totalMinutes: Math.max(0, Number((p as PhaseTask).totalMinutes ?? 0)),
    startDate: (p as PhaseTask).startDate || '',
    endDate: (p as PhaseTask).endDate || '',
    completed: Boolean((p as PhaseTask).completed),
  }));
  const rewardsIn = (o.rewards as RewardStage[] | undefined) ?? [];
  const rewards: RewardStage[] = (Array.isArray(rewardsIn) ? rewardsIn : []).map((r) => ({
    id: String((r as RewardStage).id || uid('r')),
    name: (r as RewardStage).name || '',
    content: (r as RewardStage).content || '',
    triggerType: ((r as RewardStage).triggerType || 'progress') as RewardStage['triggerType'],
    triggerValue: Number((r as RewardStage).triggerValue ?? 0),
    status: ((r as RewardStage).status || 'locked') as RewardStage['status'],
    claimedAt: (r as RewardStage).claimedAt,
  }));
  return {
    id: String(o.id || uid('g')),
    name: String(o.name || ''),
    category: (o.category as Goal['category']) || 'habit',
    customCategoryName: o.customCategoryName as string | undefined,
    finalGoal: String(o.finalGoal || ''),
    coreNeed: String(o.coreNeed || ''),
    deadline: String(o.deadline || ''),
    createdAt: String(o.createdAt || ''),
    totalDescription: String(o.totalDescription || o.finalGoal || ''),
    phases,
    dailyHabit,
    checkins: mapCheckins((o as Record<string, unknown>).checkins),
    rewards,
    progress: Math.max(0, Math.min(100, Number(o.progress ?? 0))),
    manualDeduction: Math.max(0, Number((o as Record<string, unknown>).manualDeduction ?? 0)),
    archived: Boolean((o as Record<string, unknown>).archived),
    fixed: Boolean((o as Record<string, unknown>).fixed),
    color: (o.color as Goal['color']) || 'brand',
    icon: String((o as Record<string, unknown>).icon || '🎯'),
  };
}

export function mapProfileFromApi(input: unknown): UserProfile {
  const o = keysToCamel<Record<string, unknown>>(input) as unknown as Record<string, unknown>;
  const stats = (o.stats as Record<string, number> | undefined) || {};
  return {
    userId: o.userId != null && String(o.userId) !== '' ? String(o.userId) : undefined,
    isGuest: typeof o.isGuest === 'boolean' ? o.isGuest : undefined,
    nickname: String(o.nickname || '用户'),
    avatar: o.avatar as string | undefined,
    joinedAt: String(o.joinedAt || ''),
    badges: Array.isArray(o.badges) ? o.badges as string[] : [],
    totalCheckinDays: Math.max(0, Number(o.totalCheckinDays ?? stats.totalCheckinDays ?? 0)),
    fixedHabitsCount: Math.max(0, Number(o.fixedHabitsCount ?? stats.fixedHabitsCount ?? 0)),
  };
}

export function mapSettingsFromApi(input: unknown): AppSettings {
  const o = keysToCamel<Record<string, unknown>>(input) as unknown as Record<string, unknown>;
  return {
    reminderTime: String(o.reminderTime || '19:00'),
    reminderRepeat: Math.max(1, Math.min(3, Number(o.reminderRepeat ?? 3))),
    reviewReminderEnabled: Boolean(o.reviewReminderEnabled ?? true),
    reviewReminderTime: String(o.reviewReminderTime || '19:00'),
    pushEnabled: Boolean(o.pushEnabled ?? true),
    theme: (o.theme as AppSettings['theme']) || 'light',
    dataRetention: (o.dataRetention as AppSettings['dataRetention']) || '1y',
    customEncouragements: Array.isArray(o.customEncouragements) ? o.customEncouragements as string[] : [],
    defaultProgressDeduction: clampProgressDeduction(Number(o.defaultProgressDeduction ?? 1)),
  };
}

export function mapReviewFromApi(input: unknown): ReviewReport {
  const o = keysToCamel<Record<string, unknown>>(input) as unknown as Record<string, unknown>;
  const m = o.metrics as ReviewReport['metrics'] | undefined;
  return {
    id: String(o.id || uid('rev')),
    type: (o.type as ReviewReport['type']) || 'manual',
    title: String(o.title || ''),
    date: String(o.date || ''),
    goalId: o.goalId as string | undefined,
    goalName: o.goalName as string | undefined,
    content: o.content as string | undefined,
    metrics: m
      ? {
        checkinRate: Number(m.checkinRate ?? 0),
        avgDuration: Number(m.avgDuration ?? 0),
        missedDays: Number(m.missedDays ?? 0),
        progressDelta: Number(m.progressDelta ?? 0),
        totalMinutes: Number(m.totalMinutes ?? 0),
      }
      : undefined,
    suggestions: Array.isArray(o.suggestions) ? o.suggestions as string[] : undefined,
    isFavorite: Boolean(o.isFavorite),
  };
}

export function mapSceneFromApi(input: unknown): SpecialScene {
  const o = keysToCamel<Record<string, unknown>>(input) as unknown as Record<string, unknown>;
  return {
    id: String(o.id || uid('s')),
    type: (o.type as SpecialScene['type']) || 'other',
    label: String(o.label || ''),
    startDate: String(o.startDate || ''),
    endDate: String(o.endDate || ''),
    mode: (o.mode as SpecialScene['mode']) || 'shorten',
    shortenTo: o.shortenTo !== undefined ? Number(o.shortenTo) : undefined,
    extendHours: o.extendHours !== undefined ? Number(o.extendHours) : undefined,
    active: Boolean(o.active),
  };
}

/** 创建目标时 POST body（与 docs/API 约定的 snake_case 一致） */
export function goalToCreateApiBody(g: Goal, clientOpId: string): Record<string, unknown> {
  return {
    name: g.name,
    category: g.category,
    custom_category_name: g.customCategoryName,
    final_goal: g.finalGoal,
    core_need: g.coreNeed,
    deadline: g.deadline,
    total_description: g.totalDescription,
    color: g.color,
    icon: g.icon,
    phases: (g.phases || []).map(p => ({
      name: p.name,
      description: p.description,
      total_minutes: p.totalMinutes,
      start_date: p.startDate,
      end_date: p.endDate,
    })),
    daily_habit: {
      description: g.dailyHabit.description,
      duration: g.dailyHabit.duration,
      auto_level_up: g.dailyHabit.autoLevelUp,
      level_up_step: g.dailyHabit.levelUpStep,
      days_per_week: g.dailyHabit.daysPerWeek ?? 7,
    },
    client_op_id: clientOpId,
  };
}

export function goalPatchToApi(patch: Record<string, unknown>): Record<string, unknown> {
  return keysToSnake(patch) as Record<string, unknown>;
}
