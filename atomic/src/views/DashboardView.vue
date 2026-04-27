<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Sparkles, Flame, CheckCheck, Target as TargetIcon,
  TrendingUp, Gift, ChevronRight, Sun, Moon, Coffee,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { dateKey, encouragements, formatDate, pickRandom } from '../composables/utils';
import GoalCard from '../components/GoalCard.vue';
import ProgressRing from '../components/ProgressRing.vue';

const store = useAppStore();
const router = useRouter();

const today = formatDate(new Date(), 'CN');
const weekday = formatDate(new Date(), 'WEEKDAY');

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return { text: '夜深了', icon: Moon };
  if (h < 12) return { text: '早安', icon: Sun };
  if (h < 18) return { text: '午后好', icon: Coffee };
  return { text: '晚上好', icon: Moon };
});

const motto = pickRandom(encouragements.daily);

const todayProgress = computed(() => {
  const total = store.activeGoals.length;
  if (total === 0) return 0;
  return Math.round((store.todayCheckedCount / total) * 100);
});

const availableRewards = computed(() => {
  const list: { goalName: string; goalColor: string; rewardName: string; rewardContent: string; goalId: string; rewardId: string }[] = [];
  store.activeGoals.forEach(g => {
    g.rewards.filter(r => r.status === 'available').forEach(r => {
      list.push({
        goalName: g.name, goalColor: g.color, rewardName: r.name,
        rewardContent: r.content, goalId: g.id, rewardId: r.id,
      });
    });
  });
  return list;
});

const last7Days = computed(() => {
  const days: { label: string; rate: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = dateKey(d);
    let count = 0;
    store.activeGoals.forEach(g => {
      const c = g.checkins[ds];
      if (c && (c.status === 'done' || c.status === 'late')) count++;
    });
    const total = store.activeGoals.length || 1;
    days.push({
      label: i === 0 ? '今' : ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      rate: Math.round((count / total) * 100),
      count,
    });
  }
  return days;
});

function goCheckin(goalId: string) {
  router.push(`/checkin/${goalId}`);
}
</script>

<template>
  <div class="dashboard">
    <!-- Hero -->
    <section class="hero card">
      <div class="hero__bg"></div>
      <div class="hero__content">
        <div class="hero__greeting">
          <component :is="greeting.icon" :size="14" :stroke-width="2" />
          <span>{{ greeting.text }}，{{ store.profile.nickname }}</span>
        </div>
        <h1 class="hero__title">微小坚持，正塑造一个全新的你</h1>
        <p class="hero__motto">「{{ motto }}」</p>
        <div class="hero__date">
          <span>{{ today }}</span>
          <span class="dot">·</span>
          <span>{{ weekday }}</span>
        </div>
      </div>
      <div class="hero__stats">
        <ProgressRing :value="todayProgress" :size="120" :stroke="9" color="brand" :label="'今日完成'" />
        <div class="hero__stat-grid">
          <div class="stat">
            <div class="stat__icon stat__icon--brand"><TargetIcon :size="14" :stroke-width="2" /></div>
            <div>
              <div class="stat__num num">{{ store.activeGoals.length }}</div>
              <div class="stat__label">进行中</div>
            </div>
          </div>
          <div class="stat">
            <div class="stat__icon stat__icon--mint"><CheckCheck :size="14" :stroke-width="2" /></div>
            <div>
              <div class="stat__num num">{{ store.todayCheckedCount }}<span>/{{ store.activeGoals.length }}</span></div>
              <div class="stat__label">今日已打卡</div>
            </div>
          </div>
          <div class="stat">
            <div class="stat__icon stat__icon--peach"><Flame :size="14" :stroke-width="2" /></div>
            <div>
              <div class="stat__num num">{{ store.continuousDays }}</div>
              <div class="stat__label">连续天数</div>
            </div>
          </div>
          <div class="stat">
            <div class="stat__icon stat__icon--lavender"><Sparkles :size="14" :stroke-width="2" /></div>
            <div>
              <div class="stat__num num">{{ store.profile.fixedHabitsCount }}</div>
              <div class="stat__label">已固化习惯</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="dashboard__grid">
      <!-- 今日待打卡 -->
      <section class="dashboard__col">
        <div class="section-title">
          <div class="section-title__main">
            <h3>今日待打卡</h3>
            <span class="section-title__sub">{{ store.todayPendingGoals.length }} 项待完成</span>
          </div>
          <RouterLink to="/checkin" class="section-title__link">
            前往打卡 <ChevronRight :size="14" :stroke-width="2" />
          </RouterLink>
        </div>

        <div v-if="store.todayPendingGoals.length === 0" class="empty card card--padded-lg">
          <div class="empty__icon"><CheckCheck :size="22" :stroke-width="2" /></div>
          <div class="empty__title">今天已经全部完成啦</div>
          <div class="empty__desc">享受这份从容，明日继续微小坚持</div>
        </div>

        <div v-else class="pending-list">
          <button
            v-for="g in store.todayPendingGoals"
            :key="g.id"
            class="pending-item card card--hover"
            @click="goCheckin(g.id)"
          >
            <div class="pending-item__icon" :class="`pending-item__icon--${g.color}`">{{ g.icon }}</div>
            <div class="pending-item__main">
              <div class="pending-item__name">{{ g.name }}</div>
              <div class="pending-item__desc">{{ g.dailyHabit.description }}</div>
            </div>
            <div class="pending-item__action">
              <span class="tag" :class="`tag--${g.color}`">{{ g.dailyHabit.duration }} 分钟</span>
              <ChevronRight :size="16" :stroke-width="2" />
            </div>
          </button>
        </div>
      </section>

      <!-- 周打卡热力 + 可领取奖励 -->
      <section class="dashboard__col">
        <div class="section-title">
          <div class="section-title__main">
            <h3>本周节奏</h3>
            <span class="section-title__sub">最近 7 天打卡</span>
          </div>
        </div>

        <div class="card card--padded weekly">
          <div class="weekly__bars">
            <div v-for="(d, i) in last7Days" :key="i" class="weekly__col">
              <div class="weekly__bar-wrap">
                <div
                  class="weekly__bar"
                  :style="{ height: `${Math.max(8, d.rate)}%` }"
                  :class="{ 'weekly__bar--today': i === last7Days.length - 1 }"
                ></div>
              </div>
              <div class="weekly__label">{{ d.label }}</div>
              <div class="weekly__rate num">{{ d.rate }}%</div>
            </div>
          </div>
          <div class="weekly__foot">
            <TrendingUp :size="14" :stroke-width="2" />
            <span>本周平均完成率 <strong class="num">{{ Math.round(last7Days.reduce((a, b) => a + b.rate, 0) / 7) }}%</strong></span>
          </div>
        </div>

        <div class="section-title" style="margin-top: var(--space-6)">
          <div class="section-title__main">
            <h3>可领取奖励</h3>
            <span class="section-title__sub">{{ availableRewards.length }} 项</span>
          </div>
          <RouterLink to="/rewards" class="section-title__link">
            奖励中心 <ChevronRight :size="14" :stroke-width="2" />
          </RouterLink>
        </div>

        <div v-if="availableRewards.length === 0" class="empty card card--padded">
          <div class="empty__icon"><Gift :size="20" :stroke-width="2" /></div>
          <div class="empty__title">继续坚持，奖励解锁中</div>
          <div class="empty__desc">每一次打卡都在为下一份惊喜蓄力</div>
        </div>

        <div v-else class="reward-list">
          <div v-for="r in availableRewards" :key="r.rewardId" class="reward-item card card--hover">
            <div class="reward-item__icon" :class="`reward-item__icon--${r.goalColor}`">
              <Gift :size="16" :stroke-width="2" />
            </div>
            <div class="reward-item__main">
              <div class="reward-item__name">{{ r.rewardName }}</div>
              <div class="reward-item__content">{{ r.rewardContent }}</div>
              <div class="reward-item__from">来自：{{ r.goalName }}</div>
            </div>
            <button class="btn btn--secondary btn--sm" @click="store.claimReward(r.goalId, r.rewardId)">
              领取
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- 我的目标概览 -->
    <section>
      <div class="section-title">
        <div class="section-title__main">
          <h3>目标概览</h3>
          <span class="section-title__sub">{{ store.activeGoals.length }} 个目标 · 平均进度 {{ store.overallProgress }}%</span>
        </div>
        <RouterLink to="/goals" class="section-title__link">
          全部目标 <ChevronRight :size="14" :stroke-width="2" />
        </RouterLink>
      </div>

      <div class="goal-grid">
        <GoalCard
          v-for="g in store.activeGoals"
          :key="g.id"
          :goal="g"
          @click="router.push(`/goals/${g.id}`)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

/* Hero */
.hero {
  position: relative;
  padding: var(--space-8);
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: var(--space-8);
  align-items: center;
  overflow: hidden;
  background: var(--gradient-aurora);
  border: 1px solid var(--border-subtle);
}
.hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 88% 12%, rgba(168, 155, 217, 0.18) 0%, transparent 40%),
    radial-gradient(circle at 12% 78%, rgba(125, 203, 179, 0.16) 0%, transparent 40%);
  pointer-events: none;
}
.hero__content { position: relative; z-index: 1; }
.hero__greeting {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: var(--space-4);
}
.hero__title {
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.4px;
  line-height: 1.4;
  margin-bottom: var(--space-3);
  max-width: 420px;
}
.hero__motto {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 460px;
  margin-bottom: var(--space-4);
}
.hero__date {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
.hero__date .dot { opacity: 0.5; }

.hero__stats {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-6);
  justify-content: flex-end;
}
.hero__stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  flex: 1;
  max-width: 280px;
}
.stat {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.stat__icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat__icon--brand { background: var(--brand-soft); color: var(--brand-active); }
.stat__icon--mint { background: var(--mint-soft); color: #4DA88B; }
.stat__icon--peach { background: var(--peach-soft); color: #C68A52; }
.stat__icon--lavender { background: var(--lavender-soft); color: #7665B8; }
.stat__num {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
  line-height: 1;
}
.stat__num span {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-weight: 500;
}
.stat__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 3px;
}

/* Section title link */
.section-title__link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--text-sm);
  color: var(--brand-active);
  font-weight: 500;
  transition: color var(--duration-fast) var(--ease-out);
}
.section-title__link:hover { color: var(--brand-hover); }

/* 网格 */
.dashboard__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}
.dashboard__col { min-width: 0; }

/* Pending list */
.pending-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.pending-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  text-align: left;
  width: 100%;
}
.pending-item__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.pending-item__icon--brand { background: var(--brand-soft); }
.pending-item__icon--mint { background: var(--mint-soft); }
.pending-item__icon--lavender { background: var(--lavender-soft); }
.pending-item__icon--peach { background: var(--peach-soft); }
.pending-item__main { flex: 1; min-width: 0; }
.pending-item__name {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.pending-item__desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pending-item__action {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-tertiary);
}

/* Weekly */
.weekly__bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-2);
  height: 140px;
  margin-bottom: var(--space-4);
}
.weekly__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.weekly__bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  overflow: hidden;
  min-height: 80px;
}
.weekly__bar {
  width: 100%;
  background: var(--gradient-brand);
  border-radius: var(--radius-sm);
  min-height: 4px;
  transition: height var(--duration-slow) var(--ease-out);
}
.weekly__bar--today {
  background: linear-gradient(180deg, #B6ABE2 0%, #8FAEE6 100%);
}
.weekly__label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 500;
}
.weekly__rate {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.weekly__foot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.weekly__foot strong { color: var(--brand-active); font-weight: 600; }

/* Reward list */
.reward-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.reward-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
}
.reward-item__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--brand-active);
}
.reward-item__icon--brand { background: var(--brand-soft); color: var(--brand-active); }
.reward-item__icon--mint { background: var(--mint-soft); color: #4DA88B; }
.reward-item__icon--lavender { background: var(--lavender-soft); color: #7665B8; }
.reward-item__icon--peach { background: var(--peach-soft); color: #C68A52; }
.reward-item__main { flex: 1; min-width: 0; }
.reward-item__name {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
}
.reward-item__content {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
}
.reward-item__from {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* Goal grid */
.goal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

@media (max-width: 1024px) {
  .hero { grid-template-columns: 1fr; }
  .hero__stats { justify-content: flex-start; }
  .dashboard__grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .hero { padding: var(--space-5); }
  .hero__title { font-size: 22px; }
  .hero__stat-grid { max-width: none; }
  .hero__stats { flex-direction: column; align-items: flex-start; gap: var(--space-4); }
}
</style>
