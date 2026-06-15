<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Play, Pause, RotateCcw, CheckCircle2, ChevronUp, ChevronRight,
  Clock3, Sparkles, History, Info,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { formatSeconds, lsGet, lsSet, effectiveDailyTargetMinutes } from '../composables/utils';
import { clearCheckinTimer, loadCheckinTimer, saveCheckinTimer } from '../composables/checkinTimer';
import ProgressRing from '../components/ProgressRing.vue';
import type { Goal } from '../types';

defineOptions({ name: 'CheckinView' });

const route = useRoute();
const store = useAppStore();

const SELECTED_GOAL_KEY = 'atomic-checkin-selected-goal';
const selectedId = ref<string>(String(route.params.id ?? lsGet<string>(SELECTED_GOAL_KEY, '')));

// 路由切换时同步 selectedId，避免目标显示与 URL 不一致
watch(() => route.params.id, (id) => {
  if (id) selectedId.value = String(id);
});

const goal = computed<Goal | undefined>(() => {
  if (selectedId.value) {
    const g = store.getGoal(selectedId.value);
    if (g) return g;
  }
  return store.todayPendingGoals[0] ?? store.activeGoals[0];
});

const poolFill = computed(() => {
  const p = goal.value?.progress;
  if (p == null || !Number.isFinite(Number(p))) return 0;
  return Math.min(100, Math.max(0, Number(p)));
});

const poolDropletVisible = ref(false);
const poolDropKey = ref(0);
const poolSplash = ref(false);

/** 侧栏整体显示/隐藏（向左收起，主区占满） */
const goalsListExpanded = ref(true);

function collapseGoalsSidebar() {
  goalsListExpanded.value = false;
}

function expandGoalsSidebar() {
  goalsListExpanded.value = true;
}
/** 水滴落入池：总时长与 CSS energy-drop 一致；涟漪在「入水」时刻触发 */
const POOL_DROP_MS = 2500;
const POOL_DROP_IMPACT_AT_MS = Math.round(POOL_DROP_MS * 0.918);
const POOL_RIPPLE_PHASE_MS = 1200;

function triggerPoolDrop() {
  poolDropKey.value += 1;
  poolDropletVisible.value = true;
  poolSplash.value = false;
  window.setTimeout(() => {
    poolSplash.value = true;
  }, POOL_DROP_IMPACT_AT_MS);
  window.setTimeout(() => {
    poolDropletVisible.value = false;
  }, POOL_DROP_MS + 120);
  window.setTimeout(() => {
    poolSplash.value = false;
  }, POOL_DROP_IMPACT_AT_MS + POOL_RIPPLE_PHASE_MS);
}

watch(goal, (g) => {
  if (g && !selectedId.value) selectedId.value = g.id;
}, { immediate: true });

// 受特殊场景影响后的有效目标时长（与 utils / store.checkin 一致）
const effectiveDuration = computed(() =>
  effectiveDailyTargetMinutes(goal.value?.dailyHabit.duration ?? 30, store.activeScene),
);

const targetSec = computed(() => effectiveDuration.value * 60);
const elapsed = ref(0);
/** 暂停时累计秒数；运行中与 runningSince 一起计算当前 elapsed */
const accumulated = ref(0);
const runningSince = ref<number | null>(null);
const timer = ref<ReturnType<typeof setInterval> | null>(null);

/** 是否正在计时（仅手动暂停会清除 runningSince） */
const isCounting = computed(() => runningSince.value !== null);

function syncElapsedFromClock() {
  if (runningSince.value) {
    elapsed.value = accumulated.value + Math.floor((Date.now() - runningSince.value) / 1000);
  } else {
    elapsed.value = accumulated.value;
  }
}

function persistTimer(goalId?: string) {
  const id = goalId ?? goal.value?.id;
  if (!id) return;
  syncElapsedFromClock();
  saveCheckinTimer(id, {
    accumulated: accumulated.value,
    running: runningSince.value !== null,
    runningSince: runningSince.value,
  });
}

function clearTick() {
  if (timer.value) clearInterval(timer.value);
  timer.value = null;
}

function startTick() {
  clearTick();
  timer.value = setInterval(() => {
    syncElapsedFromClock();
    persistTimer();
  }, 1000);
}

function restoreTimer(goalId: string) {
  clearTick();
  const s = loadCheckinTimer(goalId);
  if (!s) {
    elapsed.value = 0;
    accumulated.value = 0;
    runningSince.value = null;
    return;
  }
  accumulated.value = Math.max(0, s.accumulated);
  if (s.running && s.runningSince) {
    const wallDelta = Math.floor((Date.now() - s.runningSince) / 1000);
    if (accumulated.value > wallDelta + 2) {
      accumulated.value = Math.max(0, accumulated.value - wallDelta);
    }
    runningSince.value = s.runningSince;
    syncElapsedFromClock();
    startTick();
  } else {
    runningSince.value = null;
    elapsed.value = accumulated.value;
  }
}

const progressPercent = computed(() => {
  if (targetSec.value === 0) return 0;
  return Math.min(100, Math.round((elapsed.value / targetSec.value) * 100));
});

const remainingDisplay = computed(() => {
  if (elapsed.value >= targetSec.value) return '已完成目标时长';
  return `剩余 ${formatSeconds(targetSec.value - elapsed.value)}`;
});

const isPaused = computed(() => store.activeScene?.mode === 'pause');

function start() {
  if (isCounting.value || isPaused.value) return;
  accumulated.value = elapsed.value;
  runningSince.value = Date.now();
  startTick();
  persistTimer();
}

function pause() {
  if (!isCounting.value) return;
  syncElapsedFromClock();
  accumulated.value = elapsed.value;
  runningSince.value = null;
  clearTick();
  persistTimer();
}

function reset() {
  pause();
  elapsed.value = 0;
  accumulated.value = 0;
  if (goal.value) clearCheckinTimer(goal.value.id);
}

async function complete() {
  if (!goal.value) return;
  if (isPaused.value) return;
  syncElapsedFromClock();
  pause();
  const minutes = elapsed.value <= 0 ? 1 : Math.max(1, Math.round(elapsed.value / 60));
  const goalId = goal.value.id;
  try {
    await store.checkin(goalId, { duration: minutes, status: 'done' });
    triggerPoolDrop();
    elapsed.value = 0;
    accumulated.value = 0;
    clearCheckinTimer(goalId);
  } catch {
    /* 远程失败：保留已计时长，可重试 */
  }
}

const recent = computed(() => {
  if (!goal.value) return [];
  const entries = Object.values(goal.value.checkins).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  return entries;
});

watch(selectedId, (id) => {
  if (id) lsSet(SELECTED_GOAL_KEY, id);
});

function selectGoal(id: string) {
  if (selectedId.value === id) return;
  persistTimer();
  selectedId.value = id;
}

watch(
  () => goal.value?.id,
  (id, prevId) => {
    if (prevId && prevId !== id) persistTimer(prevId);
    if (id) {
      restoreTimer(id);
    } else if (prevId) {
      clearTick();
      elapsed.value = 0;
      accumulated.value = 0;
      runningSince.value = null;
    }
  },
  { immediate: true },
);

function syncTimerOnEnter() {
  const id = goal.value?.id ?? selectedId.value;
  if (!id) return;
  if (isCounting.value) {
    syncElapsedFromClock();
    if (!timer.value) startTick();
    return;
  }
  restoreTimer(id);
}

function onVisibilityChange() {
  if (!isCounting.value) return;
  syncElapsedFromClock();
  persistTimer();
}

function flushTimerOnLeave() {
  if (isCounting.value) syncElapsedFromClock();
  persistTimer();
  clearTick();
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  syncTimerOnEnter();
});

onActivated(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  syncTimerOnEnter();
});

onDeactivated(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  flushTimerOnLeave();
});

onBeforeUnmount(() => {
  flushTimerOnLeave();
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
});

function statusLabel(s: string) {
  return s === 'done' ? '正常' : s === 'late' ? '延迟' : s === 'missed' ? '未打卡' : s === 'paused' ? '暂停' : '';
}
</script>

<template>
  <div class="checkin" :class="{ 'checkin--side-collapsed': !goalsListExpanded }">
    <aside v-if="goalsListExpanded" id="checkin-sidebar" class="checkin__side">
      <div class="section-title">
        <div class="section-title__main">
          <h3>选择目标</h3>
        </div>
        <button
          type="button"
          class="link link--toggle"
          aria-expanded="true"
          aria-controls="checkin-sidebar"
          @click="collapseGoalsSidebar"
        >
          <ChevronUp :size="14" :stroke-width="2" />
          收起全部
        </button>
      </div>
      <div id="checkin-goal-list" class="goal-list">
        <button
          v-for="g in store.activeGoals"
          :key="g.id"
          class="goal-list__item"
          :class="{ 'goal-list__item--active': goal && g.id === goal.id }"
          @click="selectGoal(g.id)"
        >
          <div class="goal-list__icon" :class="`goal-list__icon--${g.color}`">{{ g.icon }}</div>
          <div class="goal-list__main">
            <div class="goal-list__name">{{ g.name }}</div>
            <div class="goal-list__sub">{{ g.dailyHabit.duration }} 分钟</div>
          </div>
          <CheckCircle2 v-if="store.todayChecked(g)" :size="16" :stroke-width="2" class="goal-list__check" />
        </button>
      </div>
    </aside>

    <!-- 主区：侧栏收起时占满宽度，左上角可展开 -->
    <main class="checkin__main">
      <button
        v-if="!goalsListExpanded"
        type="button"
        class="checkin__side-expand"
        aria-controls="checkin-sidebar"
        aria-expanded="false"
        aria-label="展开目标列表"
        @click="expandGoalsSidebar"
      >
        <ChevronRight :size="16" :stroke-width="2.2" />
        <span>展开全部</span>
      </button>
      <div v-if="!goal" class="empty card card--padded-lg">
        <div class="empty__icon"><Clock3 :size="20" /></div>
        <div class="empty__title">暂无目标</div>
        <div class="empty__desc">前往「目标」页创建一个开始打卡</div>
      </div>

      <template v-else>
        <!-- 特殊场景标识 -->
        <div v-if="store.activeScene" class="scene-banner">
          <Info :size="14" :stroke-width="2" />
          <span>
            特殊场景生效中：<strong>{{ store.activeScene.label }}</strong> ·
            {{ store.activeScene.mode === 'shorten' ? `时长缩短至 ${store.activeScene.shortenTo} 分钟`
                : store.activeScene.mode === 'extend' ? `延迟打卡延长至 ${store.activeScene.extendHours} 小时`
                : '已暂停打卡（不计入断签、不扣进度）' }}
          </span>
        </div>

        <!-- 当前目标 banner -->
        <div class="banner card card--padded" :class="`banner--${goal.color}`">
          <div class="banner__head">
            <div class="banner__icon">{{ goal.icon }}</div>
            <div>
              <div class="banner__name">{{ goal.name }}</div>
              <p class="banner__desc">{{ goal.dailyHabit.description }}</p>
            </div>
          </div>
          <div v-if="store.todayChecked(goal)" class="banner__done">
            <CheckCircle2 :size="14" :stroke-width="2.2" /> 今日已完成打卡
          </div>
        </div>

        <!-- Timer -->
        <div class="timer card card--padded-lg">
          <div class="timer__visual">
            <ProgressRing
              :value="progressPercent"
              :size="220"
              :stroke="14"
              :color="goal.color"
              :show-label="false"
            />
            <div class="timer__center">
              <div class="timer__time num">{{ formatSeconds(elapsed) }}</div>
              <div class="timer__remaining">{{ remainingDisplay }}</div>
              <div class="timer__target">
                目标 {{ effectiveDuration }} 分钟
                <span v-if="effectiveDuration !== goal.dailyHabit.duration" class="timer__shorten">
                  · 已缩短自 {{ goal.dailyHabit.duration }} 分钟
                </span>
              </div>
            </div>
          </div>

          <div class="timer__actions">
            <button v-if="!isCounting" class="btn btn--primary btn--lg" :disabled="isPaused" @click="start">
              <Play :size="18" :stroke-width="2.4" /> {{ elapsed > 0 ? '继续' : '开始打卡' }}
            </button>
            <button v-else class="btn btn--secondary btn--lg" @click="pause">
              <Pause :size="18" :stroke-width="2.4" /> 暂停
            </button>
            <button class="btn btn--outline btn--lg" :disabled="elapsed === 0" @click="reset">
              <RotateCcw :size="16" :stroke-width="2" /> 重置
            </button>
            <button class="btn btn--primary btn--lg" :disabled="isPaused" @click="complete">
              <CheckCircle2 :size="18" :stroke-width="2.4" /> 完成打卡
            </button>
          </div>
        </div>

        <!-- 目标达成池：紧接在打卡计时下方 -->
        <section
          class="energy-pool energy-pool--vitality card card--padded-lg"
          :class="{ 'energy-pool--splash': poolSplash }"
        >
          <div class="energy-pool__intro">
            <div class="energy-pool__intro-text">
              <h3 class="energy-pool__title">目标达成池</h3>
              <p class="energy-pool__tagline">当前目标完成度 · 每次成功打卡，都有一滴汇入池中</p>
            </div>
            <div class="energy-pool__badge num" aria-live="polite">
              <span class="energy-pool__badge-val">{{ Math.round(poolFill) }}</span>
              <span class="energy-pool__badge-unit">%</span>
            </div>
          </div>
          <div class="energy-pool__basin">
            <div class="energy-pool__aureole" aria-hidden="true" />
            <div class="energy-pool__vessel" :style="{ '--fill': `${poolFill}%` }">
              <div class="energy-pool__vessel-rim" />
              <div class="energy-pool__depth" />
              <div class="energy-pool__liquid">
                <div class="energy-pool__liquid-core" />
                <div class="energy-pool__liquid-bubbles" aria-hidden="true">
                  <span /><span /><span /><span /><span /><span />
                </div>
                <div class="energy-pool__wave energy-pool__wave--a" />
                <div class="energy-pool__wave energy-pool__wave--b" />
                <div class="energy-pool__wave energy-pool__wave--c" />
              </div>
              <div class="energy-pool__shine" />
              <div class="energy-pool__sparkles" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
              <div
                v-if="poolDropletVisible"
                :key="poolDropKey"
                class="energy-pool__droplet"
                aria-hidden="true"
              />
              <div v-if="poolSplash" class="energy-pool__ripples" aria-hidden="true">
                <span class="energy-pool__ripple" />
                <span class="energy-pool__ripple energy-pool__ripple--2" />
                <span class="energy-pool__ripple energy-pool__ripple--3" />
              </div>
            </div>
          </div>
        </section>

        <!-- 最近打卡 -->
        <div class="card card--padded">
          <div class="section-title">
            <div class="section-title__main">
              <h3><History :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 最近打卡</h3>
              <span class="section-title__sub">最近 5 条记录</span>
            </div>
          </div>
          <div v-if="recent.length === 0" class="empty empty--inline">
            <Sparkles :size="18" /> <span>开始你的第一次打卡吧</span>
          </div>
          <div v-else class="recent">
            <div v-for="r in recent" :key="r.date" class="recent__item">
              <div class="recent__date num">{{ r.date }}</div>
              <span class="tag" :class="r.status === 'done' ? 'tag--mint' : r.status === 'late' ? 'tag--peach' : r.status === 'missed' ? 'tag--coral' : 'tag--brand'">
                {{ statusLabel(r.status) }}
              </span>
              <div class="recent__dur num">{{ r.duration }} 分钟</div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.checkin {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
  position: relative;
  animation: fade-in var(--duration-slow) var(--ease-out);
}
.checkin--side-collapsed {
  grid-template-columns: 1fr;
  gap: 0;
}

.checkin__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}
.link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.link--toggle {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  text-align: right;
  white-space: nowrap;
}
.link:hover,
.link--toggle:hover { color: var(--brand); }

.goal-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.goal-list__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  text-align: left;
  transition: all var(--duration-fast) var(--ease-out);
}
.goal-list__item:hover {
  border-color: var(--border);
  background: var(--surface-elevated);
}
.goal-list__item--active {
  border-color: var(--brand);
  background: var(--brand-softer);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.goal-list__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.goal-list__icon--brand { background: var(--brand-soft); }
.goal-list__icon--mint { background: var(--mint-soft); }
.goal-list__icon--lavender { background: var(--lavender-soft); }
.goal-list__icon--peach { background: var(--peach-soft); }
.goal-list__main { flex: 1; min-width: 0; }
.goal-list__name {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goal-list__sub {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}
.goal-list__check { color: var(--mint); }

.checkin__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
  position: relative;
}

.checkin__side-expand {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 var(--space-2);
  padding: 8px 14px 8px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}
.checkin__side-expand:hover {
  color: var(--brand);
  border-color: var(--brand-border);
  box-shadow: var(--shadow-md);
}

/* —— 目标达成池：无外层描边/托底双层框；水池本体通栏（抵消 card 横向内边距）—— */
.energy-pool.energy-pool--vitality {
  --pool-lime: #86efac;
  --pool-accent: #22c55e;
  --pool-accent-mid: #4ade80;
  --pool-accent-deep: #15803d;
  --pool-glow: rgba(34, 197, 94, 0.38);
  --pool-glow-strong: rgba(74, 222, 128, 0.55);
}
.energy-pool {
  position: relative;
  overflow: hidden;
  border: none;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(ellipse 90% 55% at 50% -10%, rgba(123, 157, 219, 0.14), transparent 62%),
    linear-gradient(168deg, var(--surface) 0%, var(--bg-soft) 45%, var(--surface) 100%);
  box-shadow: var(--shadow-sm), 0 24px 48px -34px rgba(123, 157, 219, 0.12);
}
.energy-pool__intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.energy-pool__intro-text {
  min-width: 0;
}
.energy-pool__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  margin: 0 0 4px;
}
.energy-pool__tagline {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  line-height: 1.5;
  letter-spacing: 0.2px;
}
.energy-pool__badge {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: linear-gradient(145deg, var(--pool-accent-mid) 0%, var(--pool-accent-deep) 100%);
  color: var(--text-on-color);
  box-shadow:
    0 4px 16px var(--pool-glow),
    0 1px 0 rgba(255, 255, 255, 0.35) inset;
}
.energy-pool__badge-val {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
.energy-pool__badge-unit {
  font-size: var(--text-sm);
  font-weight: 600;
  opacity: 0.92;
}
.energy-pool__basin {
  position: relative;
  /* 抵消 card 横向内边距，水池区域与卡片内缘对齐通栏 */
  width: calc(100% + 2 * var(--space-8));
  margin-left: calc(-1 * var(--space-8));
  margin-right: calc(-1 * var(--space-8));
  padding: 0;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}
.energy-pool__aureole {
  position: absolute;
  left: 50%;
  top: 58%;
  width: 92%;
  height: 48%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, var(--pool-glow), transparent 70%);
  opacity: 0.55;
  filter: blur(18px);
  pointer-events: none;
  z-index: 0;
}
.energy-pool__vessel {
  position: relative;
  z-index: 1;
  height: 168px;
  border-radius: 22px 22px 32px 32px;
  overflow: hidden;
  border: none;
  background: var(--energy-pool-vessel-bg);
  box-shadow:
    inset 0 20px 40px rgba(255, 255, 255, 0.72),
    inset 0 -22px 36px rgba(21, 128, 61, 0.1),
    0 12px 32px rgba(22, 163, 74, 0.11),
    0 4px 12px rgba(15, 23, 42, 0.04);
}
.energy-pool__vessel-rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.75),
    inset 0 -2px 0 rgba(0, 30, 60, 0.06);
  pointer-events: none;
  z-index: 2;
}
.energy-pool__depth {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 100% 70% at 50% 0%, rgba(255, 255, 255, 0.38), transparent 50%),
    radial-gradient(ellipse 130% 85% at 50% 100%, rgba(21, 128, 61, 0.14), transparent 58%);
  pointer-events: none;
  z-index: 1;
}
.energy-pool__liquid {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--fill, 0%);
  min-height: 0;
  transition: height 0.9s cubic-bezier(0.33, 1, 0.68, 1);
  overflow: hidden;
  z-index: 2;
}
.energy-pool__liquid-core {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    188deg,
    rgba(220, 252, 231, 0.95) 0%,
    var(--pool-lime) 14%,
    var(--pool-accent-mid) 42%,
    var(--pool-accent) 72%,
    var(--pool-accent-deep) 100%
  );
  opacity: 0.98;
}
.energy-pool__liquid-bubbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.energy-pool__liquid-bubbles span {
  position: absolute;
  bottom: 8%;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.35);
  animation: energy-bubble 3.8s ease-in-out infinite;
}
.energy-pool__liquid-bubbles span:nth-child(1) { left: 10%; animation-delay: 0s; }
.energy-pool__liquid-bubbles span:nth-child(2) { left: 24%; animation-delay: 0.5s; width: 4px; height: 4px; }
.energy-pool__liquid-bubbles span:nth-child(3) { left: 42%; animation-delay: 1.1s; }
.energy-pool__liquid-bubbles span:nth-child(4) { left: 58%; animation-delay: 0.3s; width: 5px; height: 5px; }
.energy-pool__liquid-bubbles span:nth-child(5) { left: 72%; animation-delay: 1.6s; }
.energy-pool__liquid-bubbles span:nth-child(6) { left: 86%; animation-delay: 0.9s; width: 4px; height: 4px; }
@keyframes energy-bubble {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.25; }
  50% { transform: translateY(-10px) scale(1.15); opacity: 0.55; }
}
.energy-pool__wave {
  position: absolute;
  left: -18%;
  width: 136%;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
  animation: energy-wave 5.8s ease-in-out infinite;
}
.energy-pool__wave--a { top: 2px; opacity: 0.9; }
.energy-pool__wave--b {
  top: 14px;
  opacity: 0.5;
  animation-duration: 7.5s;
  animation-delay: -1.4s;
}
.energy-pool__wave--c {
  top: 26px;
  height: 14px;
  opacity: 0.35;
  animation-duration: 9s;
  animation-delay: -2s;
}
@keyframes energy-wave {
  0%, 100% { transform: translateX(0) rotate(-0.3deg); }
  50% { transform: translateX(5%) rotate(0.3deg); }
}
.energy-pool__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    118deg,
    rgba(255, 255, 255, 0.55) 0%,
    transparent 38%,
    transparent 55%,
    rgba(255, 255, 255, 0.1) 100%
  );
  pointer-events: none;
  mix-blend-mode: soft-light;
  z-index: 5;
}
.energy-pool__sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}
.energy-pool__sparkles span {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--text-on-color);
  opacity: 0;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.95);
  animation: energy-spark 3.4s ease-in-out infinite;
}
.energy-pool__sparkles span:nth-child(1) { left: 14%; top: 22%; animation-delay: 0s; }
.energy-pool__sparkles span:nth-child(2) { left: 76%; top: 18%; animation-delay: 0.55s; }
.energy-pool__sparkles span:nth-child(3) { left: 48%; top: 30%; animation-delay: 1.05s; }
.energy-pool__sparkles span:nth-child(4) { left: 90%; top: 36%; animation-delay: 1.75s; }
.energy-pool__sparkles span:nth-child(5) { left: 22%; top: 40%; animation-delay: 2.35s; }
@keyframes energy-spark {
  0%, 72%, 100% { opacity: 0; transform: scale(0.55); }
  84% { opacity: 1; transform: scale(1); }
}
.energy-pool__droplet {
  position: absolute;
  left: 50%;
  top: 10px;
  width: 22px;
  height: 27px;
  margin-left: -11px;
  border-radius: 50% 50% 46% 46%;
  background:
    radial-gradient(circle at 34% 20%, rgba(255, 255, 255, 0.98) 0%, transparent 44%),
    linear-gradient(168deg, var(--pool-accent-mid) 0%, var(--pool-accent-deep) 100%);
  box-shadow:
    0 8px 22px var(--pool-glow-strong),
    inset 0 -3px 8px rgba(21, 128, 61, 0.22);
  pointer-events: none;
  will-change: transform;
  animation: energy-drop 2.5s linear forwards;
  z-index: 8;
}
@keyframes energy-drop {
  0% {
    transform: translate3d(0, -54px, 0) scale(0.62, 0.7);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.34, 0.82, 0.55, 1);
  }
  5% {
    transform: translate3d(0, -42px, 0) scale(0.74, 0.8);
    opacity: 1;
    /* 长段下落：越来越快，贴近自由落体感 */
    animation-timing-function: cubic-bezier(0.52, 0, 1, 0.58);
  }
  /* 触底前略拉长 —— 与上层缓动接续，无明显关节点 */
  86.5% {
    transform: translate3d(0, 130px, 0) scale(1.05, 1.06);
    opacity: 1;
    animation-timing-function: cubic-bezier(0.25, 0.9, 0.38, 1);
  }
  91.8% {
    transform: translate3d(0, 147px, 0) scale(1.34, 0.72);
    opacity: 1;
    animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  }
  97% {
    transform: translate3d(0, 156px, 0) scale(1.02, 0.38);
    opacity: 0.38;
    animation-timing-function: cubic-bezier(0.2, 0.9, 0.32, 1);
  }
  100% {
    transform: translate3d(0, 162px, 0) scale(0.1, 0.05);
    opacity: 0;
  }
}
.energy-pool__ripples {
  position: absolute;
  left: 50%;
  bottom: 14px;
  width: 1px;
  height: 1px;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 7;
}
.energy-pool__ripple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  border-radius: var(--radius-full);
  border: 2px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 14px rgba(74, 222, 128, 0.45);
  opacity: 0;
  animation: energy-ripple 1.12s cubic-bezier(0.2, 0.85, 0.28, 1) forwards;
}
.energy-pool__ripple--2 { animation-delay: 0.1s; }
.energy-pool__ripple--3 { animation-delay: 0.2s; }
@keyframes energy-ripple {
  0% {
    transform: scale(0.3);
    opacity: 0.88;
  }
  100% {
    transform: scale(5.5);
    opacity: 0;
  }
}
.energy-pool--splash .energy-pool__liquid-core {
  animation: energy-pool-pulse 0.95s cubic-bezier(0.25, 0.82, 0.35, 1) forwards;
}
@keyframes energy-pool-pulse {
  0% { filter: brightness(1) saturate(1); }
  40% { filter: brightness(1.14) saturate(1.08); }
  100% { filter: brightness(1) saturate(1); }
}

.scene-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--lavender-soft);
  color: var(--accent-lavender);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  border: 1px solid rgba(168, 155, 217, 0.3);
}
.scene-banner strong { font-weight: 600; }

.timer__shorten {
  color: var(--lavender);
  font-weight: 500;
}

.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  background: var(--gradient-aurora);
  border: 1px solid var(--border-subtle);
}
.banner--mint { background: linear-gradient(135deg, var(--mint-soft) 0%, var(--brand-soft) 100%); }
.banner--lavender { background: linear-gradient(135deg, var(--lavender-soft) 0%, var(--brand-soft) 100%); }
.banner--peach { background: linear-gradient(135deg, var(--peach-soft) 0%, var(--sun-soft) 100%); }
.banner__head { display: flex; gap: var(--space-3); align-items: center; }
.banner__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.banner__name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
}
.banner__desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1.55;
  max-width: 480px;
}
.banner__done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: var(--surface);
  color: var(--mint);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
}

.timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  background: var(--surface);
}

.timer__visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.timer__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.timer__time {
  font-size: 56px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -1.5px;
  line-height: 1;
  font-feature-settings: "tnum" 1;
}
.timer__remaining {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-2);
}
.timer__target {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.timer__actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}

.timer__half-rule {
  width: 100%;
  margin: var(--space-3) 0 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: 1.55;
}

.recent {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.recent__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
}
.recent__item:last-child { border-bottom: none; }
.recent__date { flex: 1; color: var(--text-secondary); }
.recent__dur { color: var(--text-tertiary); min-width: 70px; text-align: right; }

.empty--inline {
  flex-direction: row;
  padding: var(--space-6);
  font-size: var(--text-sm);
  gap: var(--space-2);
}

@media (max-width: 1024px) {
  .checkin:not(.checkin--side-collapsed) {
    grid-template-columns: 1fr;
  }
  .checkin:not(.checkin--side-collapsed) .checkin__side {
    order: 2;
  }
}
@media (max-width: 768px) {
  .timer__time { font-size: 44px; }
  .timer__visual > .ring { width: 180px !important; height: 180px !important; }
}
</style>
