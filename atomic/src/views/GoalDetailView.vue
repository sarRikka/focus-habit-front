<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronLeft, Edit3, Trash2, Calendar, Clock3, Target as TargetIcon,
  Sparkles, Gift, Plus, CheckCircle2, Lock, Circle, Flame, Award,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { isRemote } from '../api/http';
import { dateKey, diffDays, formatDate, formatMinutes, todayStr, weeklyCheckinDayChoices } from '../composables/utils';
import ProgressRing from '../components/ProgressRing.vue';
import ProgressBar from '../components/ProgressBar.vue';
import CheckinCalendar from '../components/CheckinCalendar.vue';
import Modal from '../components/Modal.vue';
import type { RewardStage } from '../types';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const goal = computed(() => store.getGoal(String(route.params.id)));

const remainingDays = computed(() => goal.value ? Math.max(0, diffDays(todayStr(), goal.value.deadline)) : 0);

const checkinStats = computed(() => {
  const g = goal.value;
  if (!g) return { total: 0, done: 0, late: 0, missed: 0, totalMin: 0 };
  const arr = Object.values(g.checkins);
  return {
    total: arr.length,
    done: arr.filter(c => c.status === 'done').length,
    late: arr.filter(c => c.status === 'late').length,
    missed: arr.filter(c => c.status === 'missed').length,
    totalMin: arr.reduce((a, c) => a + c.duration, 0),
  };
});

const continuousDays = computed(() => {
  const g = goal.value;
  if (!g) return 0;
  let n = 0;
  for (let i = 1; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = dateKey(d);
    const c = g.checkins[ds];
    if (c && (c.status === 'done' || c.status === 'late')) n++;
    else break;
  }
  return n;
});

const showDelete = ref(false);
const showRewardModal = ref(false);
const newReward = ref<Partial<RewardStage>>({ name: '', content: '', triggerType: 'progress', triggerValue: 30 });

const showEdit = ref(false);
const editForm = reactive({
  name: '',
  finalGoal: '',
  coreNeed: '',
  deadline: '',
  dailyDescription: '',
  dailyDuration: 30,
  daysPerWeek: 7,
});

watch(() => goal.value?.id, () => {
  const g = goal.value;
  if (!g) return;
  editForm.name = g.name;
  editForm.finalGoal = g.finalGoal;
  editForm.coreNeed = g.coreNeed;
  editForm.deadline = g.deadline;
  editForm.dailyDescription = g.dailyHabit.description;
  editForm.dailyDuration = g.dailyHabit.duration;
  editForm.daysPerWeek = g.dailyHabit.daysPerWeek ?? 7;
}, { immediate: true });

onMounted(() => {
  const id = String(route.params.id);
  if (isRemote) void store.fetchGoalDetail(id);
});

watch(
  () => route.params.id,
  (id) => {
    if (isRemote && id) void store.fetchGoalDetail(String(id));
  },
);

function openEdit() {
  if (!goal.value) return;
  // 重新从最新数据回填，避免被旧值覆盖
  editForm.name = goal.value.name;
  editForm.finalGoal = goal.value.finalGoal;
  editForm.coreNeed = goal.value.coreNeed;
  editForm.deadline = goal.value.deadline;
  editForm.dailyDescription = goal.value.dailyHabit.description;
  editForm.dailyDuration = goal.value.dailyHabit.duration;
  editForm.daysPerWeek = goal.value.dailyHabit.daysPerWeek ?? 7;
  showEdit.value = true;
}

async function saveEdit() {
  if (!goal.value) return;
  if (!editForm.name.trim() || !editForm.finalGoal.trim()) return;
  const gid = goal.value.id;
  try {
    await store.updateGoal(gid, {
      name: editForm.name.trim(),
      finalGoal: editForm.finalGoal.trim(),
      coreNeed: editForm.coreNeed.trim(),
      deadline: editForm.deadline,
      dailyHabit: {
        ...goal.value.dailyHabit,
        description: editForm.dailyDescription.trim(),
        duration: Math.max(1, editForm.dailyDuration),
        daysPerWeek: Math.max(1, Math.min(7, Math.round(editForm.daysPerWeek))),
      },
    });
    if (!isRemote) store.recomputeProgress(gid);
    showEdit.value = false;
    store.showToast({ type: 'success', title: '目标已更新' });
  } catch {
    /* updateGoal 已 Toast */
  }
}

async function addReward() {
  if (!goal.value || !newReward.value.name?.trim() || !newReward.value.content?.trim()) return;
  try {
    await store.addRewardStage(goal.value.id, {
      name: newReward.value.name.trim(),
      content: newReward.value.content.trim(),
      triggerType: newReward.value.triggerType ?? 'progress',
      triggerValue: newReward.value.triggerValue ?? 30,
    });
    newReward.value = { name: '', content: '', triggerType: 'progress', triggerValue: 30 };
    showRewardModal.value = false;
    store.showToast({ type: 'success', title: '奖励阶段已添加' });
  } catch {
    /* 已 Toast */
  }
}

async function removeReward(id: string) {
  if (!goal.value) return;
  try {
    await store.removeRewardStage(goal.value.id, id);
  } catch {
    /* 已 Toast */
  }
}

async function confirmDelete() {
  if (!goal.value) return;
  try {
    await store.deleteGoal(goal.value.id);
    router.replace('/goals');
  } catch {
    /* 已 Toast */
  }
}

function onArchive() {
  if (!goal.value) return;
  void store.archiveGoal(goal.value.id);
}

function rewardLabel(r: RewardStage): string {
  if (r.triggerType === 'progress') return `进度达 ${r.triggerValue}%`;
  if (r.triggerType === 'phase') return `完成第 ${r.triggerValue} 阶段`;
  return `连续打卡 ${r.triggerValue} 天`;
}
</script>

<template>
  <div v-if="goal" class="detail">
    <!-- 顶部 -->
    <div class="detail__head">
      <button class="back" @click="router.back()">
        <ChevronLeft :size="18" :stroke-width="2" />
        <span>返回</span>
      </button>
      <div class="detail__head-actions">
        <button class="btn btn--ghost btn--sm" @click="openEdit">
          <Edit3 :size="14" :stroke-width="2" /> 编辑
        </button>
        <button v-if="!goal.archived" class="btn btn--ghost btn--sm" @click="onArchive()">
          <Award :size="14" :stroke-width="2" /> 结束目标
        </button>
        <button class="btn btn--ghost btn--sm" @click="showDelete = true">
          <Trash2 :size="14" :stroke-width="2" /> 删除
        </button>
      </div>
    </div>

    <!-- Hero -->
    <section class="hero card" :class="`hero--${goal.color}`">
      <div class="hero__bg"></div>
      <div class="hero__main">
        <div class="hero__icon">{{ goal.icon }}</div>
        <div class="hero__info">
          <div class="tag" :class="`tag--${goal.color}`">
            {{ goal.category === 'habit' ? '习惯固化' : goal.category === 'ability' ? '能力提升' : goal.category === 'state' ? '状态改善' : (goal.customCategoryName ?? '自定义') }}
          </div>
          <h1 class="hero__name">{{ goal.name }}</h1>
          <p class="hero__final">{{ goal.finalGoal }}</p>
          <div class="hero__meta">
            <div><Calendar :size="13" :stroke-width="2" /> 截止 {{ formatDate(goal.deadline, 'CN') }}</div>
            <div><Clock3 :size="13" :stroke-width="2" /> 每日 {{ goal.dailyHabit.duration }} 分钟</div>
            <div v-if="(goal.dailyHabit.daysPerWeek ?? 7) < 7"><Sparkles :size="13" :stroke-width="2" /> 每周 {{ goal.dailyHabit.daysPerWeek ?? 7 }} 天</div>
            <div v-if="continuousDays > 0"><Flame :size="13" :stroke-width="2" /> 连续 {{ continuousDays }} 天</div>
          </div>
        </div>
        <div class="hero__progress">
          <ProgressRing :value="goal.progress" :size="116" :stroke="9" :color="goal.color" label="目标进度" />
        </div>
      </div>

      <div v-if="goal.coreNeed.trim()" class="hero__core">
        <div class="hero__core-label">核心诉求 · 习惯固化判定标准</div>
        <p class="hero__core-text">{{ goal.coreNeed }}</p>
      </div>

      <div class="hero__actions">
        <button class="btn btn--primary" @click="router.push(`/checkin/${goal.id}`)">
          <CheckCircle2 :size="16" :stroke-width="2.2" />
          <span>{{ store.todayChecked(goal) ? '今日已打卡' : '前往打卡' }}</span>
        </button>
        <div class="hero__quick">
          <div class="quick">
            <div class="quick__num num">{{ remainingDays }}</div>
            <div class="quick__label">剩余天数</div>
          </div>
          <div class="quick">
            <div class="quick__num num">{{ checkinStats.total }}</div>
            <div class="quick__label">累计打卡</div>
          </div>
          <div class="quick">
            <div class="quick__num num">{{ formatMinutes(checkinStats.totalMin) }}</div>
            <div class="quick__label">已投入时长</div>
          </div>
        </div>
      </div>
    </section>

    <div class="grid">
      <!-- 阶段拆解 -->
      <section class="card card--padded">
        <div class="section-title">
          <div class="section-title__main">
            <h3>阶段拆解</h3>
            <span class="section-title__sub">{{ goal.phases.filter(p => p.completed).length }} / {{ goal.phases.length }} 已完成</span>
          </div>
        </div>

        <div class="phase-tree">
          <!-- 总事项 -->
          <div class="tree-node">
            <div class="tree-node__bullet tree-node__bullet--total"></div>
            <div class="tree-node__body">
              <div class="tree-node__head">
                <TargetIcon :size="14" :stroke-width="2" />
                <span class="tree-node__title">总事项</span>
              </div>
              <p class="tree-node__desc">{{ goal.totalDescription }}</p>
            </div>
          </div>
          <!-- 阶段 -->
          <div v-for="(p, i) in goal.phases" :key="p.id" class="tree-node">
            <div class="tree-node__bullet" :class="{ 'tree-node__bullet--done': p.completed }">
              <CheckCircle2 v-if="p.completed" :size="11" :stroke-width="2.2" />
              <span v-else class="num">{{ i + 1 }}</span>
            </div>
            <div class="tree-node__body">
              <div class="tree-node__head">
                <span class="tree-node__title">{{ p.name }}</span>
                <span class="tag" :class="p.completed ? 'tag--mint' : 'tag--brand'">
                  {{ p.completed ? '已完成' : `${formatMinutes(p.totalMinutes)} 目标` }}
                </span>
              </div>
              <p class="tree-node__desc">{{ p.description }}</p>
              <div class="tree-node__date">{{ formatDate(p.startDate, 'CN') }} → {{ formatDate(p.endDate, 'CN') }}</div>
            </div>
          </div>
          <!-- 每日 -->
          <div class="tree-node tree-node--daily">
            <div class="tree-node__bullet tree-node__bullet--daily">
              <Sparkles :size="11" :stroke-width="2.2" />
            </div>
            <div class="tree-node__body">
              <div class="tree-node__head">
                <span class="tree-node__title">每日习惯</span>
                <span class="tag tag--lavender">{{ goal.dailyHabit.duration }} 分钟</span>
                <span v-if="(goal.dailyHabit.daysPerWeek ?? 7) < 7" class="tag tag--peach">每周 {{ goal.dailyHabit.daysPerWeek ?? 7 }} 天</span>
              </div>
              <p class="tree-node__desc">{{ goal.dailyHabit.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 日历 -->
      <section class="card card--padded">
        <div class="section-title">
          <div class="section-title__main">
            <h3>打卡轨迹</h3>
            <span class="section-title__sub">{{ checkinStats.done }} 已打卡 · {{ checkinStats.late }} 延迟 · {{ checkinStats.missed }} 未打卡</span>
          </div>
        </div>
        <CheckinCalendar :goal="goal" />
      </section>
    </div>

    <!-- 进度明细 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3>进度明细</h3>
        </div>
      </div>
      <div class="progress-detail">
        <ProgressBar :value="goal.progress" :height="10" :color="goal.color" />
        <div class="detail-rows">
          <div class="detail-row">
            <span>累计完成时长</span>
            <strong class="num">{{ formatMinutes(checkinStats.totalMin) }}</strong>
          </div>
          <div class="detail-row">
            <span>目标总时长</span>
            <strong class="num">{{ formatMinutes(goal.phases.reduce((a, p) => a + p.totalMinutes, 0)) }}</strong>
          </div>
          <div class="detail-row">
            <span>剩余目标时长</span>
            <strong class="num">{{ formatMinutes(Math.max(0, goal.phases.reduce((a, p) => a + p.totalMinutes, 0) - checkinStats.totalMin)) }}</strong>
          </div>
          <div class="detail-row">
            <span>当前进度</span>
            <strong class="num text-brand">{{ goal.progress }}%</strong>
          </div>
        </div>
      </div>
    </section>

    <!-- 阶段奖励 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3>阶段奖励</h3>
          <span class="section-title__sub">自定义你的正向激励</span>
        </div>
        <button class="btn btn--secondary btn--sm" @click="showRewardModal = true">
          <Plus :size="14" :stroke-width="2.2" /> 添加奖励
        </button>
      </div>

      <div v-if="goal.rewards.length === 0" class="empty">
        <div class="empty__icon"><Gift :size="20" :stroke-width="2" /></div>
        <div class="empty__title">还没有奖励</div>
        <div class="empty__desc">为坚持设定一份小确幸吧</div>
      </div>

      <div v-else class="reward-grid">
        <div
          v-for="r in goal.rewards"
          :key="r.id"
          class="reward-card card"
          :class="`reward-card--${r.status}`"
        >
          <div class="reward-card__head">
            <div class="reward-card__icon">
              <Lock v-if="r.status === 'locked'" :size="14" :stroke-width="2" />
              <Gift v-else-if="r.status === 'available'" :size="14" :stroke-width="2" />
              <Award v-else :size="14" :stroke-width="2" />
            </div>
            <div class="reward-card__name">{{ r.name }}</div>
            <button class="btn btn--ghost btn--icon btn--sm" @click="removeReward(r.id)">
              <Trash2 :size="13" :stroke-width="2" />
            </button>
          </div>
          <p class="reward-card__content">{{ r.content }}</p>
          <div class="reward-card__trigger">触发条件：{{ rewardLabel(r) }}</div>
          <button
            v-if="r.status === 'available'"
            class="btn btn--primary btn--sm btn--block"
            style="margin-top: 12px"
            @click="store.claimReward(goal.id, r.id)"
          >立即领取</button>
          <div v-else-if="r.status === 'claimed'" class="reward-card__claimed">
            <CheckCircle2 :size="13" :stroke-width="2.2" /> 已领取于 {{ r.claimedAt }}
          </div>
          <div v-else class="reward-card__claimed reward-card__claimed--locked">
            <Circle :size="13" :stroke-width="2" /> 待解锁
          </div>
        </div>
      </div>
    </section>

    <!-- 删除确认 -->
    <Modal :open="showDelete" title="确认删除该目标？" desc="删除后该目标的打卡、复盘、奖励数据将保留在历史记录中" @close="showDelete = false">
      <p class="text-secondary">此操作不可撤销。建议先确认是否需要导出该目标的复盘资料。</p>
      <template #footer>
        <button class="btn btn--ghost" @click="showDelete = false">取消</button>
        <button class="btn btn--danger" @click="confirmDelete">确认删除</button>
      </template>
    </Modal>

    <!-- 编辑目标 -->
    <Modal :open="showEdit" title="编辑目标" desc="支持调整名称、最终目标、截止时间、每日时长等" :width="540" @close="showEdit = false">
      <div class="form__field">
        <label class="form__label">目标名称</label>
        <input v-model="editForm.name" class="input" />
      </div>
      <div class="form__field">
        <label class="form__label">最终目标</label>
        <input v-model="editForm.finalGoal" class="input" />
      </div>
      <div class="form__field">
        <label class="form__label">核心诉求（可选）</label>
        <textarea v-model="editForm.coreNeed" class="textarea" rows="2" placeholder="可留空"></textarea>
      </div>
      <div class="form__field">
        <label class="form__label">截止日期</label>
        <input v-model="editForm.deadline" type="date" class="input" />
      </div>
      <div class="form__field">
        <label class="form__label">每日具体事项</label>
        <textarea v-model="editForm.dailyDescription" class="textarea" rows="2"></textarea>
      </div>
      <div class="form__field">
        <label class="form__label">每日时长（分钟）</label>
        <input v-model.number="editForm.dailyDuration" type="number" min="1" class="input" />
      </div>
      <div class="form__field">
        <label class="form__label">每周打卡天数</label>
        <div class="weekly-days" role="radiogroup" aria-label="每周计划打卡天数">
          <button
            v-for="opt in weeklyCheckinDayChoices"
            :key="opt.value"
            type="button"
            role="radio"
            :aria-checked="editForm.daysPerWeek === opt.value"
            class="weekly-days__btn"
            :class="{ 'weekly-days__btn--active': editForm.daysPerWeek === opt.value }"
            @click="editForm.daysPerWeek = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn--ghost" @click="showEdit = false">取消</button>
        <button class="btn btn--primary" @click="saveEdit">保存</button>
      </template>
    </Modal>

    <!-- 添加奖励 -->
    <Modal :open="showRewardModal" title="添加阶段奖励" desc="设定一份能让你心动的小奖励" @close="showRewardModal = false">
      <div class="form__field">
        <label class="form__label">奖励名称</label>
        <input v-model="newReward.name" class="input" placeholder="例：半程奖励" />
      </div>
      <div class="form__field">
        <label class="form__label">奖励内容</label>
        <input v-model="newReward.content" class="input" placeholder="例：一本想读已久的书" />
      </div>
      <div class="form__field">
        <label class="form__label">触发条件</label>
        <div class="seg">
          <button class="seg__btn" :class="{ 'seg__btn--active': newReward.triggerType === 'progress' }" @click="newReward.triggerType = 'progress'">按进度</button>
          <button class="seg__btn" :class="{ 'seg__btn--active': newReward.triggerType === 'phase' }" @click="newReward.triggerType = 'phase'">按阶段</button>
          <button class="seg__btn" :class="{ 'seg__btn--active': newReward.triggerType === 'days' }" @click="newReward.triggerType = 'days'">按天数</button>
        </div>
      </div>
      <div class="form__field">
        <label class="form__label">
          {{ newReward.triggerType === 'progress' ? '进度（%）' : newReward.triggerType === 'phase' ? '阶段序号' : '连续打卡天数' }}
        </label>
        <input v-model.number="newReward.triggerValue" type="number" min="1" class="input" />
      </div>
      <template #footer>
        <button class="btn btn--ghost" @click="showRewardModal = false">取消</button>
        <button class="btn btn--primary" @click="addReward">添加</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: fade-in var(--duration-slow) var(--ease-out);
}
.detail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
.back:hover { color: var(--text-primary); }
.detail__head-actions { display: flex; gap: 4px; }

/* Hero */
.hero {
  position: relative;
  padding: var(--space-6) var(--space-8);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}
.hero__bg {
  position: absolute;
  inset: 0;
  background: var(--gradient-aurora);
  opacity: 0.5;
  pointer-events: none;
}
.hero--brand .hero__bg { background: linear-gradient(135deg, var(--brand-soft) 0%, var(--lavender-soft) 100%); }
.hero--mint .hero__bg { background: linear-gradient(135deg, var(--mint-soft) 0%, var(--brand-soft) 100%); }
.hero--lavender .hero__bg { background: linear-gradient(135deg, var(--lavender-soft) 0%, var(--brand-soft) 100%); }
.hero--peach .hero__bg { background: linear-gradient(135deg, var(--peach-soft) 0%, var(--sun-soft) 100%); }

.hero__main {
  position: relative;
  display: flex;
  gap: var(--space-5);
  align-items: flex-start;
}
.hero__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  border: 1px solid var(--border-subtle);
}
.hero__info { flex: 1; min-width: 0; }
.hero__name {
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  margin: var(--space-2) 0 4px;
}
.hero__final {
  font-size: var(--text-md);
  color: var(--text-secondary);
}
.hero__meta {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-3);
  flex-wrap: wrap;
}
.hero__meta > div {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.hero__progress { flex-shrink: 0; }

.hero__core {
  position: relative;
  margin-top: var(--space-5);
  padding: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.hero__core-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.6px;
  margin-bottom: 6px;
}
.hero__core-text {
  font-size: var(--text-md);
  color: var(--text-primary);
  line-height: 1.6;
}

.hero__actions {
  position: relative;
  margin-top: var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-5);
  justify-content: space-between;
  flex-wrap: wrap;
}
.hero__quick { display: flex; gap: var(--space-6); }
.quick__num {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.quick__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* grid */
.grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--space-6);
}

/* Phase tree */
.phase-tree {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.tree-node {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  position: relative;
}
.tree-node:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 32px;
  bottom: -8px;
  width: 1px;
  background: var(--border);
}
.tree-node__bullet {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--bg-soft);
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}
.tree-node__bullet--total { background: var(--brand-soft); color: var(--brand-active); }
.tree-node__bullet--done { background: var(--mint); color: var(--text-on-color); }
.tree-node__bullet--daily { background: var(--lavender-soft); color: var(--accent-lavender); }

.tree-node__body { flex: 1; min-width: 0; padding-top: 2px; }
.tree-node__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.tree-node__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
}
.tree-node__desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}
.tree-node__date {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* progress detail */
.progress-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.detail-rows {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Reward cards */
.reward-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}
.reward-card {
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
}
.reward-card--available { border-color: var(--mint); background: var(--mint-soft); }
.reward-card--claimed { opacity: 0.85; }
.reward-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.reward-card__icon {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--brand-soft);
  color: var(--brand-active);
  display: flex;
  align-items: center;
  justify-content: center;
}
.reward-card--available .reward-card__icon { background: var(--mint); color: var(--text-on-color); }
.reward-card--claimed .reward-card__icon { background: var(--peach-soft); color: var(--peach); }
.reward-card__name {
  flex: 1;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
}
.reward-card__content {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 4px 0 6px;
}
.reward-card__trigger {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
.reward-card__claimed {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: var(--space-3);
  font-size: var(--text-xs);
  color: var(--mint);
  font-weight: 500;
}
.reward-card__claimed--locked { color: var(--text-tertiary); }

/* Modal form helpers */
.form__field { margin-bottom: var(--space-4); }
.form__label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.seg {
  display: inline-flex;
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}
.seg__btn {
  padding: 6px var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
  border-radius: var(--radius-sm);
}
.seg__btn--active {
  background: var(--surface);
  color: var(--brand-active);
  box-shadow: var(--shadow-xs);
}

@media (max-width: 1024px) {
  .grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .hero { padding: var(--space-5); }
  .hero__main { flex-direction: column; align-items: stretch; }
  .hero__progress { align-self: center; }
  .detail-rows { grid-template-columns: 1fr; }
}
</style>
