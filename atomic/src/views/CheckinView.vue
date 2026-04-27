<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Play, Pause, RotateCcw, CheckCircle2, ChevronLeft,
  Clock3, Sparkles, AlertCircle, ChevronRight, History, Info,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { formatSeconds } from '../composables/utils';
import ProgressRing from '../components/ProgressRing.vue';
import Modal from '../components/Modal.vue';
import type { Goal } from '../types';

const route = useRoute();
const store = useAppStore();

const selectedId = ref<string>(String(route.params.id ?? ''));

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

watch(goal, (g) => {
  if (g && !selectedId.value) selectedId.value = g.id;
}, { immediate: true });

// 受特殊场景影响后的有效目标时长
const effectiveDuration = computed(() => {
  const base = goal.value?.dailyHabit.duration ?? 10;
  const scene = store.activeScene;
  if (scene?.mode === 'shorten' && scene.shortenTo) {
    return Math.max(1, Math.min(base, scene.shortenTo));
  }
  return base;
});

const targetSec = computed(() => effectiveDuration.value * 60);
const elapsed = ref(0);
const timer = ref<ReturnType<typeof setInterval> | null>(null);
const running = ref(false);

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
  if (running.value || isPaused.value) return;
  running.value = true;
  timer.value = setInterval(() => {
    elapsed.value += 1;
  }, 1000);
}

function pause() {
  if (timer.value) clearInterval(timer.value);
  timer.value = null;
  running.value = false;
}

function reset() {
  pause();
  elapsed.value = 0;
}

const showMissed = ref(false);

function complete(late = false) {
  if (!goal.value) return;
  pause();
  // elapsed 不足 1 分钟时，按 1 分钟计；按钮已禁用 elapsed < 5 秒
  const minutes = Math.max(1, Math.round(elapsed.value / 60));
  store.checkin(goal.value.id, { duration: minutes, status: late ? 'late' : 'done' });
  elapsed.value = 0;
}

function applyMiss(deduct: boolean) {
  if (!goal.value) return;
  store.applyMissed(goal.value.id, deduct);
  showMissed.value = false;
}

const recent = computed(() => {
  if (!goal.value) return [];
  const entries = Object.values(goal.value.checkins).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  return entries;
});

onUnmounted(() => {
  if (timer.value) clearInterval(timer.value);
});

function statusLabel(s: string) {
  return s === 'done' ? '正常' : s === 'late' ? '延迟' : s === 'missed' ? '未打卡' : s === 'paused' ? '暂停' : '';
}
</script>

<template>
  <div class="checkin">
    <!-- 选择目标 -->
    <aside class="checkin__side">
      <div class="section-title">
        <div class="section-title__main">
          <h3>选择目标</h3>
        </div>
        <RouterLink to="/goals" class="link"><ChevronLeft :size="14" :stroke-width="2" />全部</RouterLink>
      </div>
      <div class="goal-list">
        <button
          v-for="g in store.activeGoals"
          :key="g.id"
          class="goal-list__item"
          :class="{ 'goal-list__item--active': goal && g.id === goal.id }"
          @click="selectedId = g.id; reset()"
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

    <!-- 主区 -->
    <main class="checkin__main">
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
            <button v-if="!running" class="btn btn--primary btn--lg" :disabled="isPaused" @click="start">
              <Play :size="18" :stroke-width="2.4" /> {{ elapsed > 0 ? '继续' : '开始打卡' }}
            </button>
            <button v-else class="btn btn--secondary btn--lg" @click="pause">
              <Pause :size="18" :stroke-width="2.4" /> 暂停
            </button>
            <button class="btn btn--outline btn--lg" :disabled="elapsed === 0" @click="reset">
              <RotateCcw :size="16" :stroke-width="2" /> 重置
            </button>
            <button class="btn btn--primary btn--lg" :disabled="elapsed < 5 || isPaused" @click="complete(false)">
              <CheckCircle2 :size="18" :stroke-width="2.4" /> 完成打卡
            </button>
          </div>

          <div class="timer__sub">
            <div class="timer__sub-item" @click="complete(true)">
              <Clock3 :size="14" :stroke-width="2" />
              <span>延迟打卡（截止后 1 小时内）</span>
              <ChevronRight :size="14" :stroke-width="2" />
            </div>
            <div class="timer__sub-item" @click="showMissed = true">
              <AlertCircle :size="14" :stroke-width="2" />
              <span>今日无法完成？</span>
              <ChevronRight :size="14" :stroke-width="2" />
            </div>
          </div>
        </div>

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

    <!-- 未完成弹窗 -->
    <Modal :open="showMissed" title="今日未完成打卡" desc="是否降低对应目标的进度？" @close="showMissed = false">
      <p class="text-secondary">未打卡且未延迟打卡，可选择是否扣除当前进度（默认 {{ store.settings.defaultProgressDeduction }}%）。不指责，不苛求 — 重启即胜利。</p>
      <template #footer>
        <button class="btn btn--ghost" @click="applyMiss(false)">仅记录，不扣除</button>
        <button class="btn btn--danger" @click="applyMiss(true)">扣除 {{ store.settings.defaultProgressDeduction }}% 进度</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.checkin {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.checkin__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.link:hover { color: var(--brand); }

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
}

.scene-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--lavender-soft);
  color: #7665B8;
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

.timer__sub {
  display: flex;
  gap: var(--space-3);
  width: 100%;
  flex-wrap: wrap;
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-4);
}
.timer__sub-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--duration-fast);
}
.timer__sub-item:hover {
  background: var(--brand-softer);
  color: var(--brand-active);
}
.timer__sub-item span { flex: 1; }

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
  .checkin { grid-template-columns: 1fr; }
  .checkin__side {
    order: 2;
  }
}
@media (max-width: 768px) {
  .timer__time { font-size: 44px; }
  .timer__visual > .ring { width: 180px !important; height: 180px !important; }
}
</style>
