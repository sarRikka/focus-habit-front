/**
 * 远程模式：鉴权、全量拉取
 */

import { uid } from '../composables/utils';
import { getTokens, setTokens, isRemote } from './http';
import {
  authApi, userApi, settingsApi, goalApi, reviewApi, sceneApi,
} from './index';
import {
  mapGoalFromApi, mapProfileFromApi, mapSettingsFromApi, mapReviewFromApi, mapSceneFromApi,
} from './mappers';
import type { Goal, ReviewReport, SpecialScene, UserProfile, AppSettings } from '../types';

const DEVICE_ID_KEY = 'atomic-device-id';

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY) ?? '';
  if (!id) {
    id = `dev_${uid('')}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * 无 Token 时尝试游客接口（与 PRD 游客模式一致）
 * 可设置 VITE_ENABLE_GUEST=0 关闭
 */
export async function ensureAuth(): Promise<void> {
  if (getTokens()?.access_token) return;
  if (import.meta.env.VITE_ENABLE_GUEST === '0') {
    return;
  }
  try {
    const r = await authApi.guest(getOrCreateDeviceId());
    setTokens({
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: Date.now() + (r.expires_in ?? 7200) * 1000,
    });
  } catch {
    // 无游客接口时由调用方在拉数据失败后再提示
  }
}

function normalizeList<T>(raw: unknown, map: (x: unknown) => T): T[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map(map);
  if (typeof raw === 'object' && 'items' in (raw as object)) {
    const it = (raw as { items?: unknown[] }).items;
    return Array.isArray(it) ? it.map(map) : [];
  }
  if (typeof raw === 'object' && 'records' in (raw as object)) {
    const it = (raw as { records?: unknown[] }).records;
    return Array.isArray(it) ? it.map(map) : [];
  }
  if (typeof raw === 'object' && 'data' in (raw as object) && Array.isArray((raw as { data: unknown[] }).data)) {
    return (raw as { data: unknown[] }).data.map(map);
  }
  return [];
}

export interface RemoteSnapshot {
  goals: Goal[];
  reviews: ReviewReport[];
  scenes: SpecialScene[];
  profile: UserProfile;
  settings: AppSettings;
}

/**
 * 从服务端拉全量（可替换为 /sync/pull 一次合并）
 */
export async function pullRemoteSnapshot(): Promise<RemoteSnapshot> {
  if (!isRemote) {
    throw new Error('VITE_DATA_SOURCE 不是 remote');
  }

  await ensureAuth();

  const emptyProfile: UserProfile = {
    nickname: '用户',
    joinedAt: '',
    badges: [],
    totalCheckinDays: 0,
    fixedHabitsCount: 0,
  };
  const emptySettings: AppSettings = {
    reminderTime: '19:00',
    reminderRepeat: 3,
    reviewReminderEnabled: true,
    reviewReminderTime: '19:00',
    pushEnabled: true,
    theme: 'light',
    dataRetention: '1y',
    customEncouragements: [],
    defaultProgressDeduction: 1,
  };

  const results = await Promise.allSettled([
    userApi.me(),
    settingsApi.get(),
    goalApi.list({ status: 'all', page_size: 200 }),
    reviewApi.list({ type: 'all', page_size: 200 }),
    sceneApi.list(),
  ]);

  let profile: UserProfile = { ...emptyProfile };
  if (results[0].status === 'fulfilled') {
    try {
      profile = mapProfileFromApi(results[0].value);
    } catch { /* 保持默认 */ }
  }

  let settings: AppSettings = { ...emptySettings };
  if (results[1].status === 'fulfilled') {
    try {
      settings = mapSettingsFromApi(results[1].value);
    } catch { /* 保持默认 */ }
  }

  let goals: Goal[] = [];
  if (results[2].status === 'fulfilled') {
    const v = results[2].value as { items?: unknown[] } | unknown[];
    const arr = Array.isArray(v) ? v : (v as { items?: unknown[] })?.items;
    goals = normalizeList(arr, mapGoalFromApi);
  }

  let reviews: ReviewReport[] = [];
  if (results[3].status === 'fulfilled') {
    const v = results[3].value as { items?: unknown[] } | unknown[];
    const arr = Array.isArray(v) ? v : (v as { items?: unknown[] })?.items;
    reviews = normalizeList(arr, mapReviewFromApi);
  }

  let scenes: SpecialScene[] = [];
  if (results[4].status === 'fulfilled') {
    const v = results[4].value as { items?: unknown[]; active_scene?: unknown } | unknown[];
    if (v && typeof v === 'object' && !Array.isArray(v) && 'items' in v) {
      scenes = normalizeList((v as { items?: unknown[] }).items, mapSceneFromApi);
    } else {
      scenes = normalizeList(v, mapSceneFromApi);
    }
  }

  return { goals, reviews, scenes, profile, settings };
}

/** 单目标详情（列表不含打卡明细时补拉） */
export async function pullGoalDetail(goalId: string): Promise<Goal> {
  await ensureAuth();
  const raw = await goalApi.detail(goalId);
  return mapGoalFromApi(raw);
}
