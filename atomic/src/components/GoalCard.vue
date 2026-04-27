<script setup lang="ts">
import { computed } from 'vue';
import { Calendar, Clock3, Flame } from 'lucide-vue-next';
import type { Goal } from '../types';
import { dateKey, diffDays, todayStr } from '../composables/utils';
import ProgressBar from './ProgressBar.vue';

const props = defineProps<{ goal: Goal; compact?: boolean }>();

const remainingDays = computed(() => Math.max(0, diffDays(todayStr(), props.goal.deadline)));
const continuousDays = computed(() => {
  let n = 0;
  for (let i = 1; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = dateKey(d);
    const c = props.goal.checkins[ds];
    if (c && (c.status === 'done' || c.status === 'late')) n++;
    else break;
  }
  return n;
});
</script>

<template>
  <div class="goal-card card card--hover" :class="`goal-card--${goal.color}`">
    <div class="goal-card__head">
      <div class="goal-card__icon">{{ goal.icon }}</div>
      <div class="goal-card__meta">
        <div class="goal-card__name">{{ goal.name }}</div>
        <div class="goal-card__sub">
          <Calendar :size="12" :stroke-width="2" />
          <span>剩余 {{ remainingDays }} 天</span>
          <span class="dot">·</span>
          <Clock3 :size="12" :stroke-width="2" />
          <span>{{ goal.dailyHabit.duration }} 分钟 / 天</span>
        </div>
      </div>
      <div v-if="continuousDays > 0" class="goal-card__streak">
        <Flame :size="14" :stroke-width="2" />
        <span class="num">{{ continuousDays }}</span>
      </div>
    </div>

    <div v-if="!compact" class="goal-card__body">
      <p class="goal-card__desc">{{ goal.dailyHabit.description }}</p>
    </div>

    <div class="goal-card__footer">
      <ProgressBar :value="goal.progress" :color="goal.color" />
      <div class="goal-card__progress-num num">{{ goal.progress }}<span>%</span></div>
    </div>
  </div>
</template>

<style scoped>
.goal-card {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.goal-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.goal-card--brand::before { background: var(--gradient-brand); }
.goal-card--mint::before { background: var(--gradient-mint); }
.goal-card--lavender::before { background: var(--gradient-lavender); }
.goal-card--peach::before { background: var(--gradient-peach); }

.goal-card__head {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}
.goal-card__icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: var(--bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.goal-card--brand .goal-card__icon { background: var(--brand-soft); }
.goal-card--mint .goal-card__icon { background: var(--mint-soft); }
.goal-card--lavender .goal-card__icon { background: var(--lavender-soft); }
.goal-card--peach .goal-card__icon { background: var(--peach-soft); }

.goal-card__meta { flex: 1; min-width: 0; }
.goal-card__name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goal-card__sub {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.goal-card__sub .dot { opacity: 0.5; }

.goal-card__streak {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--peach-soft);
  color: var(--peach);
  font-size: var(--text-sm);
  font-weight: 600;
}

.goal-card__body {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.55;
}
.goal-card__desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goal-card__footer {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: auto;
}
.goal-card__progress-num {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  min-width: 42px;
  text-align: right;
}
.goal-card__progress-num span {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: 500;
  margin-left: 1px;
}
</style>
