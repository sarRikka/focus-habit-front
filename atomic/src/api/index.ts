/**
 * 接口封装层 — 与 docs/API.md 一一对应
 *
 * 注意：
 * - 后端字段统一 snake_case，TypeScript 内部使用 camelCase
 * - 简单字段差异已在调用层处理；如需复杂转换可引入 mapper
 */

import { http } from './http';
import type {
  Goal, ReviewReport, SpecialScene, UserProfile, AppSettings, CheckinRecord, RewardStage,
} from '../types';

/* ==================== 认证 ==================== */
export const authApi = {
  guest:     (deviceId: string) =>
    http.post<{ user_id: string; access_token: string; refresh_token: string; expires_in: number; is_guest: boolean }>(
      '/auth/guest', { device_id: deviceId },
    ),
  sendCode:  (phone: string, scene = 'login') => http.post<void>('/auth/send-code', { phone, scene }),
  /** 手机号 + 密码登录；`merge_guest_user_id` 可将当前游客数据并入该账号 */
  login:     (phone: string, password: string, mergeGuestUserId?: string) =>
    http.post<{ user_id: string; access_token: string; refresh_token: string; expires_in: number; is_guest: boolean }>(
      '/auth/login', { phone, password, merge_guest_user_id: mergeGuestUserId },
    ),
  /** 新用户注册；响应与 login 一致时客户端可直接写入 token 并完成同步 */
  register: (phone: string, password: string, mergeGuestUserId?: string) =>
    http.post<{ user_id: string; access_token: string; refresh_token: string; expires_in: number; is_guest: boolean }>(
      '/auth/register', { phone, password, merge_guest_user_id: mergeGuestUserId },
    ),
  refresh:   (refreshToken: string) =>
    http.post<{ access_token: string; refresh_token: string; expires_in: number }>(
      '/auth/refresh', { refresh_token: refreshToken },
    ),
  logout:    () => http.post<void>('/auth/logout'),
};

/* ==================== 用户 ==================== */
export const userApi = {
  me:           () => http.get<UserProfile & { stats: Record<string, number> }>('/me'),
  updateMe:     (patch: Partial<UserProfile>) => http.patch<UserProfile>('/me', patch),
  achievements: () => http.get<{ items: { key: string; name: string; desc: string; earned: boolean; earned_at: string | null }[] }>('/me/achievements'),
};

/* ==================== 设置 ==================== */
export const settingsApi = {
  get:                 () => http.get<AppSettings>('/settings'),
  update:              (patch: Partial<AppSettings>) => http.patch<AppSettings>('/settings', patch),
  addEncouragement:    (content: string) => http.post<void>('/settings/encouragements', { content }),
  removeEncouragement: (index: number) => http.delete<void>(`/settings/encouragements/${index}`),
};

/* ==================== 目标 ==================== */
type GoalListQuery = {
  status?: 'active' | 'fixed' | 'archived' | 'all';
  category?: 'habit' | 'ability' | 'state' | 'custom';
  keyword?: string;
  page?: number;
  page_size?: number;
};

export const goalApi = {
  list:    (query?: GoalListQuery) => http.get<{ items: Goal[]; total: number; page: number; page_size: number }>('/goals', query),
  detail:  (id: string) => http.get<Goal>(`/goals/${id}`),
  create:  (payload: Record<string, unknown>) => http.post<unknown>('/goals', payload),
  update:  (id: string, patch: Partial<Goal>) => http.patch<Goal>(`/goals/${id}`, patch),
  archive: (id: string) => http.post<Goal>(`/goals/${id}/archive`),
  delete:  (id: string, hard = false) => http.delete<void>(`/goals/${id}`, { hard }),

  // 阶段
  addPhase:      (goalId: string, body: unknown) => http.post(`/goals/${goalId}/phases`, body),
  updatePhase:   (goalId: string, phaseId: string, body: unknown) => http.patch(`/goals/${goalId}/phases/${phaseId}`, body),
  deletePhase:   (goalId: string, phaseId: string) => http.delete(`/goals/${goalId}/phases/${phaseId}`),
  completePhase: (goalId: string, phaseId: string) => http.post(`/goals/${goalId}/phases/${phaseId}/complete`),
};

/* ==================== 打卡 ==================== */
export interface CheckinResult {
  checkin: CheckinRecord;
  goal_progress: number;
  phase_completed: { id: string; name: string } | null;
  habit_fixed: boolean;
  rewards_unlocked: RewardStage[];
  encouragement: string;
}

export const checkinApi = {
  doCheckin: (
    goalId: string,
    payload: { date?: string; duration: number; status?: 'done' | 'late'; note?: string; client_op_id: string },
  ) => http.post<CheckinResult>(`/goals/${goalId}/checkins`, payload),

  markMissed: (
    goalId: string,
    payload: { date?: string; deduct_progress: boolean; deduction_percent?: number; client_op_id: string },
  ) => http.post<{ goal_progress: number; deducted: number; manual_deduction_total: number }>(
    `/goals/${goalId}/checkins/missed`, payload,
  ),

  delete:    (goalId: string, date: string) => http.delete<void>(`/goals/${goalId}/checkins/${date}`),
  list:      (goalId: string, query: { start_date?: string; end_date?: string; status?: string }) =>
    http.get<{ items: CheckinRecord[] }>(`/goals/${goalId}/checkins`, query),
  today:     () => http.get<{
    date: string;
    items: { goal_id: string; goal_name: string; goal_icon: string; daily_habit: string; duration_target: number; checked: boolean }[];
    checked_count: number;
    total_count: number;
    progress_percent: number;
  }>('/checkins/today'),
};

/* ==================== Dashboard / 进度 ==================== */
export const statsApi = {
  dashboard: () => http.get<{
    today: { date: string; weekday: string; checked_count: number; total_count: number; progress_percent: number };
    stats: { active_goals: number; continuous_days: number; fixed_habits: number };
    weekly_rates: { date: string; rate: number }[];
    available_rewards: unknown[];
    motto: string;
    active_scene: SpecialScene | null;
  }>('/dashboard'),

  goalProgress: (goalId: string) => http.get<{
    progress: number;
    manual_deduction: number;
    completed_minutes: number;
    total_minutes: number;
    remaining_minutes: number;
    checkin_stats: { total: number; done: number; late: number; missed: number };
    continuous_days: number;
  }>(`/goals/${goalId}/progress`),

  calendar: (goalId: string, year: number, month: number) =>
    http.get<{ year: number; month: number; cells: CheckinRecord[] }>(`/goals/${goalId}/calendar`, { year, month }),
};

/* ==================== 奖励 ==================== */
export const rewardApi = {
  listByGoal: (goalId: string) => http.get<{ items: RewardStage[] }>(`/goals/${goalId}/rewards`),
  listAll:    (status?: 'available' | 'locked' | 'claimed' | 'all') =>
    http.get<{ items: (RewardStage & { goal_id: string; goal_name: string; goal_icon: string; goal_color: string; trigger_label: string })[] }>(
      '/rewards', { status },
    ),
  add:    (goalId: string, body: Partial<RewardStage> & { client_op_id: string }) => http.post<RewardStage>(`/goals/${goalId}/rewards`, body),
  update: (goalId: string, rewardId: string, body: Partial<RewardStage>) => http.patch<RewardStage>(`/goals/${goalId}/rewards/${rewardId}`, body),
  delete: (goalId: string, rewardId: string) => http.delete<void>(`/goals/${goalId}/rewards/${rewardId}`),
  claim:  (goalId: string, rewardId: string) => http.post<RewardStage>(`/goals/${goalId}/rewards/${rewardId}/claim`),
};

/* ==================== 复盘 ==================== */
type ReviewListQuery = {
  type?: 'weekly' | 'monthly' | 'manual' | 'all';
  goal_id?: string;
  start_date?: string;
  end_date?: string;
  keyword?: string;
  is_favorite?: boolean;
  page?: number;
  page_size?: number;
};

export const reviewApi = {
  list:     (query?: ReviewListQuery) => http.get<{ items: ReviewReport[]; total: number }>('/reviews', query),
  detail:   (id: string) => http.get<ReviewReport>(`/reviews/${id}`),
  add:      (body: Partial<ReviewReport> & { client_op_id: string }) => http.post<ReviewReport>('/reviews', body),
  update:   (id: string, body: Partial<ReviewReport>) => http.patch<ReviewReport>(`/reviews/${id}`, body),
  delete:   (id: string) => http.delete<void>(`/reviews/${id}`),
  favorite: (id: string, isFavorite: boolean) => http.post<ReviewReport>(`/reviews/${id}/favorite`, { is_favorite: isFavorite }),
  generate: (scope: 'weekly' | 'monthly', force = false) => http.post<ReviewReport>('/reviews/generate', { scope, force }),
  trend:    (limit = 8) => http.get<{ items: ReviewReport[] }>('/reviews/trend', { limit }),
  guides:   () => http.get<{ items: string[] }>('/reviews/guides'),
};

/* ==================== 特殊场景 ==================== */
export const sceneApi = {
  list:   () => http.get<{ items: SpecialScene[]; active_scene: SpecialScene | null }>('/scenes'),
  add:    (body: Partial<SpecialScene> & { client_op_id: string }) => http.post<SpecialScene>('/scenes', body),
  update: (id: string, body: Partial<SpecialScene>) => http.patch<SpecialScene>(`/scenes/${id}`, body),
  delete: (id: string) => http.delete<void>(`/scenes/${id}`),
};

/* ==================== 数据 / 同步 ==================== */
export const dataApi = {
  history: (query: { kind?: string; goal_id?: string; start_date?: string; end_date?: string }) =>
    http.get<{ items: unknown[] }>('/history', query),
  exportData: (format: 'json' | 'csv') => http.post<{ task_id: string; status: string; download_url: string | null }>('/data/export', { format }),
  exportStatus: (taskId: string) => http.get<{ task_id: string; status: string; download_url: string | null }>(`/data/export/${taskId}`),
  reset: () => http.post<void>('/data/reset', { confirm: 'RESET' }),

  syncPush: (operations: { client_op_id: string; client_ts: string; type: string; payload: unknown }[]) =>
    http.post<{ results: { client_op_id: string; ok: boolean; data?: unknown; error?: { code: number; message: string } }[]; server_ts: string }>(
      '/sync/push', { operations },
    ),
  syncPull: (since?: string) => http.get('/sync/pull', { since }),
};

/* ==================== 通知 ==================== */
export const notificationApi = {
  registerDevice: (platform: 'ios' | 'android' | 'web', pushToken: string, deviceId: string) =>
    http.post<void>('/notifications/devices', { platform, push_token: pushToken, device_id: deviceId }),
  list: (unreadOnly = false) => http.get<{ items: unknown[] }>('/notifications', { unread_only: unreadOnly }),
  markRead: (ids: string[], all = false) => http.post<void>('/notifications/read', { notification_ids: ids, all }),
};

export { http, ApiError, isRemote, getTokens, setTokens } from './http';
