import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type {
  Goal, ReviewReport, SpecialScene, UserProfile, AppSettings,
  ToastMessage, CheckinStatus, RewardStage, CheckinRecord,
} from '../types';
import {
  seedGoals, seedReviews, seedScenes, seedProfile, seedSettings,
} from '../data/seed';
import {
  lsGet, lsSet, todayStr, uid, addDays, diffDays, encouragements, pickRandom, clampProgressDeduction,
  normalizePhoneE164, clamp,
} from '../composables/utils';
import { isRemote, ApiError, setTokens } from '../api/http';
import {
  authApi, checkinApi, goalApi, reviewApi, sceneApi, settingsApi, userApi, rewardApi, dataApi,
} from '../api';
import { pullRemoteSnapshot, pullGoalDetail } from '../api/remote';
import {
  mapGoalFromApi, mapProfileFromApi, mapSettingsFromApi, mapReviewFromApi, mapSceneFromApi,
  goalToCreateApiBody, goalPatchToApi, keysToCamel,
} from '../api/mappers';

const LS_KEY = 'atomic-app-state-v2';

interface PersistedState {
  goals: Goal[];
  reviews: ReviewReport[];
  scenes: SpecialScene[];
  profile: UserProfile;
  settings: AppSettings;
}

/**
 * 把可能由旧版本写入的目标补齐缺失字段，避免渲染异常。
 */
function migrateGoal(g: Partial<Goal> & { id: string }): Goal {
  const merged = {
    manualDeduction: 0,
    archived: false,
    fixed: false,
    progress: 0,
    checkins: {},
    rewards: [],
    phases: [],
    ...g,
  } as Goal;
  const dh = merged.dailyHabit;
  merged.dailyHabit = {
    description: String(dh?.description ?? ''),
    duration: Math.max(1, Number(dh?.duration ?? 30)),
    autoLevelUp: Boolean(dh?.autoLevelUp),
    levelUpStep: Math.max(1, Number(dh?.levelUpStep ?? 1)),
    daysPerWeek: dh?.daysPerWeek != null ? clamp(Number(dh.daysPerWeek), 1, 7) : 7,
  };
  return merged;
}

function emptyState(): PersistedState {
  return {
    goals: [],
    reviews: [],
    scenes: [],
    profile: {
      nickname: '加载中',
      joinedAt: '',
      badges: [],
      totalCheckinDays: 0,
      fixedHabitsCount: 0,
    },
    settings: seedSettings(),
  };
}

function loadState(): PersistedState {
  if (isRemote) {
    return emptyState();
  }
  const fallbackGoals = seedGoals();
  const raw = lsGet<PersistedState>(LS_KEY, {
    goals: fallbackGoals,
    reviews: seedReviews(fallbackGoals),
    scenes: seedScenes(),
    profile: seedProfile(),
    settings: seedSettings(),
  });
  raw.goals = (raw.goals ?? []).map(migrateGoal);
  return raw;
}

export const useAppStore = defineStore('app', () => {
  const initial = loadState();

  const goals = ref<Goal[]>(initial.goals);
  const reviews = ref<ReviewReport[]>(initial.reviews);
  const scenes = ref<SpecialScene[]>(initial.scenes);
  const profile = ref<UserProfile>(initial.profile);
  const settings = ref<AppSettings>(initial.settings);
  const remoteReady = ref(!isRemote);
  const remoteError = ref<string | null>(null);

  const toasts = ref<ToastMessage[]>([]);

  /* ==================== 持久化：仅 mock 写本地，remote 以服务端为准 ==================== */
  if (!isRemote) {
    watch(
      [goals, reviews, scenes, profile, settings],
      () => {
        lsSet<PersistedState>(LS_KEY, {
          goals: goals.value,
          reviews: reviews.value,
          scenes: scenes.value,
          profile: profile.value,
          settings: settings.value,
        });
      },
      { deep: true },
    );
  }

  /* ==================== Toast ==================== */
  function showToast(t: Omit<ToastMessage, 'id'>) {
    const toast: ToastMessage = { id: uid('t'), duration: 2600, ...t };
    toasts.value.push(toast);
    setTimeout(() => {
      const i = toasts.value.findIndex(x => x.id === toast.id);
      if (i > -1) toasts.value.splice(i, 1);
    }, toast.duration);
  }

  /* ==================== 目标 ==================== */
  const activeGoals = computed(() => goals.value.filter(g => !g.archived));
  const archivedGoals = computed(() => goals.value.filter(g => g.archived));
  const fixedGoals = computed(() => goals.value.filter(g => g.fixed));

  function getGoal(id: string): Goal | undefined {
    return goals.value.find(g => g.id === id);
  }

  async function addGoal(g: Goal): Promise<string> {
    try {
      if (isRemote) {
        const body = goalToCreateApiBody(g, uid('op'));
        const created = await goalApi.create(body);
        const mapped = mapGoalFromApi(created);
        goals.value.unshift(mapped);
        showToast({ type: 'success', title: '目标创建成功', desc: '可以开始拆解每日习惯啦' });
        return mapped.id;
      }
      goals.value.unshift(g);
      showToast({ type: 'success', title: '目标创建成功', desc: '可以开始拆解每日习惯啦' });
      return g.id;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : '创建失败';
      showToast({ type: 'danger', title: '创建失败', desc: msg });
      throw e;
    }
  }

  async function updateGoal(id: string, patch: Partial<Goal>) {
    const g = getGoal(id);
    if (!g) return;
    if (isRemote) {
      try {
        const apiPatch: Record<string, unknown> = {};
        if (patch.name !== undefined) apiPatch.name = patch.name;
        if (patch.finalGoal !== undefined) apiPatch.final_goal = patch.finalGoal;
        if (patch.coreNeed !== undefined) apiPatch.core_need = patch.coreNeed;
        if (patch.deadline !== undefined) apiPatch.deadline = patch.deadline;
        if (patch.totalDescription !== undefined) apiPatch.total_description = patch.totalDescription;
        if (patch.color !== undefined) apiPatch.color = patch.color;
        if (patch.icon !== undefined) apiPatch.icon = patch.icon;
        if (patch.archived !== undefined) apiPatch.archived = patch.archived;
        if (patch.dailyHabit) {
          apiPatch.daily_habit = goalPatchToApi({ dailyHabit: patch.dailyHabit } as any).daily_habit;
        }
        if (Object.keys(apiPatch).length) {
          const updated = await goalApi.update(id, apiPatch);
          const mapped = mapGoalFromApi(updated);
          Object.assign(g, mapped);
        } else {
          Object.assign(g, patch);
        }
      } catch (e) {
        showToast({ type: 'danger', title: '保存失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      Object.assign(g, patch);
    }
  }

  async function archiveGoal(id: string) {
    if (isRemote) {
      try {
        const updated = await goalApi.archive(id);
        const g = getGoal(id);
        if (g) Object.assign(g, mapGoalFromApi(updated));
        showToast({ type: 'info', title: '目标已结束', desc: '历史数据保留在归档中' });
      } catch (e) {
        showToast({ type: 'danger', title: '操作失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      const g = getGoal(id);
      if (g) g.archived = true;
      showToast({ type: 'info', title: '目标已结束', desc: '历史数据保留在归档中' });
    }
  }

  async function deleteGoal(id: string) {
    if (isRemote) {
      try {
        await goalApi.delete(id, false);
        const i = goals.value.findIndex(g => g.id === id);
        if (i > -1) {
          const g = goals.value[i];
          if (g.fixed && profile.value.fixedHabitsCount > 0) {
            profile.value.fixedHabitsCount -= 1;
          }
          goals.value.splice(i, 1);
        }
        showToast({ type: 'info', title: '已删除目标' });
      } catch (e) {
        showToast({ type: 'danger', title: '删除失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      const i = goals.value.findIndex(g => g.id === id);
      if (i > -1) {
        const g = goals.value[i];
        if (g.fixed && profile.value.fixedHabitsCount > 0) {
          profile.value.fixedHabitsCount -= 1;
        }
        goals.value.splice(i, 1);
        showToast({ type: 'info', title: '已删除目标' });
      }
    }
  }

  /* ==================== 打卡 ==================== */
  function todayChecked(g: Goal): boolean {
    const c = g.checkins[todayStr()];
    return !!c && (c.status === 'done' || c.status === 'late');
  }

  /**
   * 计算目标的"总目标分钟数"。
   * - 优先用 phases 总时长（PRD 推荐）
   * - 若 phases 总时长为 0（如纯习惯类如早起），按 (deadline - createdAt) 总天数 × 每日时长 兜底
   */
  function totalMinutesOf(g: Goal): number {
    const phaseTotal = g.phases.reduce((sum, p) => sum + p.totalMinutes, 0);
    if (phaseTotal > 0) return phaseTotal;
    const days = Math.max(1, diffDays(g.createdAt, g.deadline));
    return days * Math.max(1, g.dailyHabit.duration);
  }

  async function checkin(
    goalId: string,
    opts: { duration: number; status?: CheckinStatus; date?: string } = { duration: 0 },
  ) {
    const g = getGoal(goalId);
    if (!g) return;
    const date = opts.date ?? todayStr();
    const status = opts.status ?? 'done';
    const previous = g.checkins[date];
    const wasChecked = !!previous && (previous.status === 'done' || previous.status === 'late');

    if (isRemote) {
      try {
        const res = await checkinApi.doCheckin(goalId, {
          date,
          duration: opts.duration,
          status: (status === 'late' || status === 'done' ? status : 'done') as 'done' | 'late',
          client_op_id: uid('op'),
        });
        g.checkins[date] = keysToCamel(res.checkin) as CheckinRecord;
        g.progress = res.goal_progress;
        if (res.rewards_unlocked?.length) {
          (res.rewards_unlocked as unknown[]).forEach((raw) => {
            const r = keysToCamel(raw) as RewardStage;
            const existing = g.rewards.find(x => x.id === r.id);
            if (existing) Object.assign(existing, r);
            else g.rewards.push(r);
          });
        }
        if (res.habit_fixed) {
          g.fixed = true;
          profile.value.badges = Array.from(new Set([...profile.value.badges, '习惯掌控者']));
          profile.value.fixedHabitsCount += 1;
        }
        if (status === 'done' || status === 'late') {
          if (!wasChecked) {
            profile.value.totalCheckinDays += 1;
            checkRewards(goalId);
            showToast({
              type: 'success',
              title: status === 'late' ? '延迟打卡成功' : '打卡完成',
              desc: res.encouragement || pickRandom(encouragements.daily),
            });
          } else {
            showToast({ type: 'info', title: '今日打卡已更新', desc: '已用最新时长替换原记录' });
          }
        }
      } catch (e) {
        showToast({ type: 'danger', title: '打卡失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
      return;
    }

    g.checkins[date] = { date, status, duration: opts.duration };
    recomputeProgress(goalId);

    if (status === 'done' || status === 'late') {
      if (!wasChecked) {
        profile.value.totalCheckinDays += 1;
        checkRewards(goalId);
        showToast({
          type: 'success',
          title: status === 'late' ? '延迟打卡成功' : '打卡完成',
          desc: pickRandom(encouragements.daily),
        });
      } else {
        showToast({
          type: 'info',
          title: '今日打卡已更新',
          desc: '已用最新时长替换原记录',
        });
      }
    }
  }

  async function applyMissed(goalId: string, deduct: boolean, deductionPercent?: number) {
    const g = getGoal(goalId);
    if (!g) return;
    const date = todayStr();
    const previous = g.checkins[date];
    const deduction = deduct
      ? clampProgressDeduction(deductionPercent ?? 1)
      : 0;
    g.checkins[date] = { date, status: 'missed', duration: 0 };

    if (isRemote) {
      try {
        const r = await checkinApi.markMissed(goalId, {
          date,
          deduct_progress: deduct,
          deduction_percent: deduct ? deduction : undefined,
          client_op_id: uid('op'),
        });
        g.progress = r.goal_progress;
        g.manualDeduction = r.manual_deduction_total;
        if (deduct) {
          showToast({ type: 'warning', title: `进度 -${r.deducted ?? deduction}%`, desc: pickRandom(encouragements.low) });
        } else {
          showToast({ type: 'info', title: '已记录今日未打卡', desc: pickRandom(encouragements.low) });
        }
      } catch (e) {
        showToast({ type: 'danger', title: '提交失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
      return;
    }

    if (deduct) {
      g.manualDeduction = (g.manualDeduction ?? 0) + deduction;
      recomputeProgress(goalId);
      showToast({
        type: 'warning',
        title: `进度 -${deduction}%`,
        desc: pickRandom(encouragements.low),
      });
    } else if (!previous || previous.status !== 'missed') {
      showToast({ type: 'info', title: '已记录今日未打卡', desc: pickRandom(encouragements.low) });
    }
  }

  function recomputeProgress(goalId: string) {
    const g = getGoal(goalId);
    if (!g) return;
    const total = totalMinutesOf(g);
    const completed = Object.values(g.checkins).reduce((sum, c) => {
      return sum + (c.status === 'done' || c.status === 'late' ? c.duration : 0);
    }, 0);
    const rawRatio = Math.round((completed / total) * 100);
    const ratio = Math.max(0, Math.min(100, rawRatio - (g.manualDeduction ?? 0)));
    if (ratio !== g.progress) g.progress = ratio;

    // 自动判定阶段完成（按累计完成时长 vs 阶段累计阈值）
    let cumulative = 0;
    g.phases.forEach((p) => {
      cumulative += p.totalMinutes;
      const wasCompleted = p.completed;
      const shouldComplete = p.totalMinutes > 0
        ? completed >= cumulative
        : todayStr() >= p.endDate; // 无时长的纯习惯阶段，按到期完成
      if (shouldComplete && !wasCompleted) {
        p.completed = true;
        showToast({
          type: 'success',
          title: `阶段达成：${p.name}`,
          desc: '继续保持，下一段路已经在脚下',
          duration: 3500,
        });
      }
    });

    if (g.progress >= 100 && !g.fixed) {
      g.fixed = true;
      profile.value.badges = Array.from(new Set([...profile.value.badges, '习惯掌控者']));
      profile.value.fixedHabitsCount += 1;
      showToast({
        type: 'success',
        title: '习惯固化成功！',
        desc: '解锁「习惯掌控者」身份标签',
        duration: 4000,
      });
    }
  }

  function checkRewards(goalId: string) {
    const g = getGoal(goalId);
    if (!g) return;
    const checkinDays = Object.values(g.checkins).filter(c => c.status === 'done' || c.status === 'late').length;
    g.rewards.forEach((r: RewardStage) => {
      if (r.status !== 'locked') return;
      let met = false;
      if (r.triggerType === 'progress' && g.progress >= r.triggerValue) met = true;
      if (r.triggerType === 'phase') {
        const completedPhases = g.phases.filter(p => p.completed).length;
        if (completedPhases >= r.triggerValue) met = true;
      }
      if (r.triggerType === 'days' && checkinDays >= r.triggerValue) met = true;
      if (met) {
        r.status = 'available';
        showToast({
          type: 'success',
          title: '奖励已解锁',
          desc: `${r.name}：${r.content}`,
          duration: 3500,
        });
      }
    });
  }

  async function addRewardStage(
    goalId: string,
    r: { name: string; content: string; triggerType: RewardStage['triggerType']; triggerValue: number },
  ) {
    const g = getGoal(goalId);
    if (!g) return;
    if (isRemote) {
      try {
        const created = await rewardApi.add(goalId, {
          name: r.name,
          content: r.content,
          trigger_type: r.triggerType,
          trigger_value: r.triggerValue,
          client_op_id: uid('op'),
        } as unknown as Parameters<typeof rewardApi.add>[1]);
        g.rewards.push(keysToCamel(created) as RewardStage);
        checkRewards(goalId);
      } catch (e) {
        showToast({ type: 'danger', title: '添加失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      g.rewards.push({
        id: uid('r'),
        name: r.name,
        content: r.content,
        triggerType: r.triggerType,
        triggerValue: r.triggerValue,
        status: 'locked',
      });
      checkRewards(goalId);
    }
  }

  async function removeRewardStage(goalId: string, rewardId: string) {
    const g = getGoal(goalId);
    if (!g) return;
    if (isRemote) {
      try {
        await rewardApi.delete(goalId, rewardId);
        g.rewards = g.rewards.filter(x => x.id !== rewardId);
      } catch (e) {
        showToast({ type: 'danger', title: '删除失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      g.rewards = g.rewards.filter(x => x.id !== rewardId);
    }
  }

  async function claimReward(goalId: string, rewardId: string) {
    const g = getGoal(goalId);
    if (!g) return;
    const r = g.rewards.find(x => x.id === rewardId);
    if (!r) return;
    if (isRemote) {
      try {
        const updated = await rewardApi.claim(goalId, rewardId);
        const mapped = keysToCamel(updated) as RewardStage;
        Object.assign(r, mapped);
        showToast({ type: 'success', title: '奖励已领取', desc: pickRandom(encouragements.reward) });
      } catch (e) {
        showToast({ type: 'danger', title: '领取失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      r.status = 'claimed';
      r.claimedAt = todayStr();
      showToast({ type: 'success', title: '奖励已领取', desc: pickRandom(encouragements.reward) });
    }
  }

  /* ==================== 复盘 ==================== */
  async function addReview(r: Omit<ReviewReport, 'id'>) {
    if (isRemote) {
      try {
        const body = {
          ...goalPatchToApi({ ...r } as Record<string, unknown>),
          client_op_id: uid('op'),
        } as Record<string, unknown>;
        const created = await reviewApi.add(body as Parameters<typeof reviewApi.add>[0]);
        reviews.value.unshift(mapReviewFromApi(created));
        showToast({ type: 'success', title: '复盘已归档' });
      } catch (e) {
        showToast({ type: 'danger', title: '保存失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      reviews.value.unshift({ ...r, id: uid('rev') });
      showToast({ type: 'success', title: '复盘已归档' });
    }
  }

  async function deleteReview(id: string) {
    if (isRemote) {
      try {
        await reviewApi.delete(id);
        const i = reviews.value.findIndex(r => r.id === id);
        if (i > -1) reviews.value.splice(i, 1);
      } catch (e) {
        showToast({ type: 'danger', title: '删除失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      const i = reviews.value.findIndex(r => r.id === id);
      if (i > -1) reviews.value.splice(i, 1);
    }
  }

  async function toggleReviewFavorite(id: string) {
    const r = reviews.value.find(x => x.id === id);
    if (!r) return;
    const next = !r.isFavorite;
    if (isRemote) {
      try {
        const updated = await reviewApi.favorite(id, next);
        Object.assign(r, mapReviewFromApi(updated));
      } catch (e) {
        showToast({ type: 'danger', title: '操作失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      r.isFavorite = next;
    }
  }

  /* ==================== 特殊场景 ==================== */
  /** 判断场景是否在今日生效（替代静态 active 字段） */
  function isSceneActive(s: SpecialScene): boolean {
    const today = todayStr();
    return today >= s.startDate && today <= s.endDate;
  }

  /** 当前生效的场景（优先级：暂停 > 缩短 > 延长） */
  const activeScene = computed<SpecialScene | undefined>(() => {
    const list = scenes.value.filter(isSceneActive);
    if (list.length === 0) return undefined;
    return (
      list.find(x => x.mode === 'pause') ??
      list.find(x => x.mode === 'shorten') ??
      list[0]
    );
  });

  async function addScene(s: Omit<SpecialScene, 'id' | 'active'>) {
    if (isRemote) {
      try {
        const created = await sceneApi.add({
          type: s.type,
          label: s.label,
          start_date: s.startDate,
          end_date: s.endDate,
          mode: s.mode,
          shorten_to: s.shortenTo,
          extend_hours: s.extendHours,
          client_op_id: uid('op'),
        } as Parameters<typeof sceneApi.add>[0]);
        scenes.value.unshift(mapSceneFromApi(created));
        showToast({ type: 'success', title: '特殊场景已设置' });
      } catch (e) {
        showToast({ type: 'danger', title: '保存失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      scenes.value.unshift({ ...s, id: uid('s'), active: false });
      showToast({ type: 'success', title: '特殊场景已设置' });
    }
  }

  async function deleteScene(id: string) {
    if (isRemote) {
      try {
        await sceneApi.delete(id);
        const i = scenes.value.findIndex(x => x.id === id);
        if (i > -1) scenes.value.splice(i, 1);
      } catch (e) {
        showToast({ type: 'danger', title: '删除失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      const i = scenes.value.findIndex(x => x.id === id);
      if (i > -1) scenes.value.splice(i, 1);
    }
  }

  /* ==================== 设置 ==================== */
  async function updateSettings(patch: Partial<AppSettings>) {
    if (isRemote) {
      try {
        const p = goalPatchToApi({ ...patch } as Record<string, unknown>);
        const updated = await settingsApi.update(p);
        Object.assign(settings.value, mapSettingsFromApi(updated));
      } catch (e) {
        showToast({ type: 'danger', title: '设置保存失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      Object.assign(settings.value, patch);
    }
  }

  async function updateProfile(patch: Partial<UserProfile>) {
    if (isRemote) {
      try {
        const p = goalPatchToApi({ ...patch } as Record<string, unknown>);
        const updated = await userApi.updateMe(p as any);
        Object.assign(profile.value, mapProfileFromApi(updated));
      } catch (e) {
        showToast({ type: 'danger', title: '资料保存失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      Object.assign(profile.value, patch);
    }
  }

  async function resetAll() {
    if (isRemote) {
      try {
        await dataApi.reset();
        await bootstrapFromRemote();
        showToast({ type: 'info', title: '数据已按服务端策略重置' });
      } catch (e) {
        showToast({ type: 'danger', title: '重置失败', desc: e instanceof ApiError ? e.message : '网络错误' });
        throw e;
      }
    } else {
      const fresh = {
        goals: seedGoals(),
        reviews: seedReviews(seedGoals()),
        scenes: seedScenes(),
        profile: seedProfile(),
        settings: seedSettings(),
      };
      goals.value = fresh.goals;
      reviews.value = fresh.reviews;
      scenes.value = fresh.scenes;
      profile.value = fresh.profile;
      settings.value = fresh.settings;
      showToast({ type: 'info', title: '已重置示例数据' });
    }
  }

  async function bootstrapFromRemote() {
    remoteError.value = null;
    if (!isRemote) {
      remoteReady.value = true;
      return;
    }
    try {
      remoteReady.value = false;
      const s = await pullRemoteSnapshot();
      goals.value = s.goals;
      reviews.value = s.reviews;
      scenes.value = s.scenes;
      profile.value = s.profile;
      settings.value = s.settings;
    } catch (e) {
      remoteError.value = e instanceof Error ? e.message : '拉取数据失败';
      showToast({ type: 'danger', title: '无法从服务端拉取数据', desc: remoteError.value || '' });
    } finally {
      remoteReady.value = true;
    }
  }

  /** 手机号 + 密码登录；可选合并当前游客账户数据（merge_guest_user_id） */
  async function loginWithPassword(phone: string, password: string, mergeGuest = true) {
    if (!isRemote) return;
    const normalized = normalizePhoneE164(phone);
    if (!normalized.startsWith('+')) {
      showToast({ type: 'warning', title: '手机号格式有误', desc: '请输入中国大陆手机号或带国家码的号码' });
      return;
    }
    const mergeId = mergeGuest && profile.value.isGuest === true && profile.value.userId
      ? profile.value.userId
      : undefined;
    try {
      const r = await authApi.login(normalized, password, mergeId);
      setTokens({
        access_token: r.access_token,
        refresh_token: r.refresh_token,
        expires_at: Date.now() + (r.expires_in ?? 7200) * 1000,
      });
      await bootstrapFromRemote();
      showToast({ type: 'success', title: '登录成功', desc: '数据已与云端同步' });
    } catch (e) {
      showToast({ type: 'danger', title: '登录失败', desc: e instanceof ApiError ? e.message : '网络错误' });
      throw e;
    }
  }

  /** 注册：响应含 token 时与登录等同，直接拉取远程快照 */
  async function registerWithPassword(phone: string, password: string, mergeGuest = true) {
    if (!isRemote) return;
    const normalized = normalizePhoneE164(phone);
    if (!normalized.startsWith('+')) {
      showToast({ type: 'warning', title: '手机号格式有误', desc: '请输入中国大陆手机号或带国家码的号码' });
      return;
    }
    const mergeId = mergeGuest && profile.value.isGuest === true && profile.value.userId
      ? profile.value.userId
      : undefined;
    try {
      const r = await authApi.register(normalized, password, mergeId);
      setTokens({
        access_token: r.access_token,
        refresh_token: r.refresh_token,
        expires_at: Date.now() + (r.expires_in ?? 7200) * 1000,
      });
      await bootstrapFromRemote();
      showToast({ type: 'success', title: '注册成功', desc: '数据已与云端同步' });
    } catch (e) {
      showToast({ type: 'danger', title: '注册失败', desc: e instanceof ApiError ? e.message : '网络错误' });
      throw e;
    }
  }

  /** 退出当前账号并回到游客会话（若开启游客接口） */
  async function logoutAccount() {
    if (!isRemote) return;
    try {
      await authApi.logout();
    } catch {
      /* 令牌失效时仍清除本地会话 */
    }
    setTokens(null);
    try {
      await bootstrapFromRemote();
      showToast({ type: 'info', title: '已退出登录', desc: '已切换为游客会话' });
    } catch (e) {
      remoteError.value = e instanceof Error ? e.message : '刷新失败';
      showToast({ type: 'danger', title: '退出后刷新失败', desc: remoteError.value || '' });
    }
  }

  async function fetchGoalDetail(id: string) {
    if (!isRemote) return;
    try {
      const g = await pullGoalDetail(id);
      const i = goals.value.findIndex(x => x.id === id);
      if (i > -1) goals.value[i] = g;
      else goals.value.push(g);
    } catch { /* 列表页可能无权限或 404，忽略 */ }
  }

  /* ==================== 派生 ==================== */
  const todayCheckedCount = computed(() =>
    activeGoals.value.filter(g => todayChecked(g)).length,
  );

  const todayPendingGoals = computed(() =>
    activeGoals.value.filter(g => !todayChecked(g)),
  );

  const overallProgress = computed(() => {
    if (activeGoals.value.length === 0) return 0;
    const sum = activeGoals.value.reduce((a, g) => a + g.progress, 0);
    return Math.round(sum / activeGoals.value.length);
  });

  const continuousDays = computed(() => {
    let n = 0;
    for (let i = 1; i < 365; i++) {
      const d = addDays(todayStr(), -i);
      const any = activeGoals.value.some(g => {
        const c = g.checkins[d];
        return c && (c.status === 'done' || c.status === 'late');
      });
      if (!any) break;
      n += 1;
    }
    return n;
  });

  /* ==================== 主题 ==================== */
  watch(() => settings.value.theme, (theme) => {
    document.documentElement.dataset.theme = theme;
  }, { immediate: true });

  return {
    goals, reviews, scenes, profile, settings, toasts,
    activeGoals, archivedGoals, fixedGoals, activeScene,
    todayCheckedCount, todayPendingGoals, overallProgress, continuousDays,
    remoteReady, remoteError,
    getGoal, addGoal, updateGoal, archiveGoal, deleteGoal,
    todayChecked, checkin, applyMissed, recomputeProgress, checkRewards,
    addRewardStage, removeRewardStage, claimReward,
    addReview, deleteReview, toggleReviewFavorite,
    addScene, deleteScene, isSceneActive,
    updateSettings, updateProfile, resetAll, showToast, totalMinutesOf,
    bootstrapFromRemote, fetchGoalDetail,
    loginWithPassword, registerWithPassword, logoutAccount,
  };
});
