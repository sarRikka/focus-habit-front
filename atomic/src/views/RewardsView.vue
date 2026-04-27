<script setup lang="ts">
import { computed, ref } from 'vue';
import { Gift, Lock, Award, Sparkles } from 'lucide-vue-next';
import { useAppStore } from '../stores/app';

const store = useAppStore();

type Tab = 'available' | 'locked' | 'claimed';
const tab = ref<Tab>('available');

interface Item {
  goalId: string;
  goalName: string;
  goalIcon: string;
  goalColor: string;
  rewardId: string;
  rewardName: string;
  rewardContent: string;
  triggerLabel: string;
  status: 'locked' | 'available' | 'claimed';
  claimedAt?: string;
}

const all = computed<Item[]>(() => {
  const list: Item[] = [];
  store.goals.forEach(g => {
    g.rewards.forEach(r => {
      const trigger = r.triggerType === 'progress' ? `进度达 ${r.triggerValue}%`
        : r.triggerType === 'phase' ? `完成第 ${r.triggerValue} 阶段`
        : `连续打卡 ${r.triggerValue} 天`;
      list.push({
        goalId: g.id,
        goalName: g.name,
        goalIcon: g.icon,
        goalColor: g.color,
        rewardId: r.id,
        rewardName: r.name,
        rewardContent: r.content,
        triggerLabel: trigger,
        status: r.status,
        claimedAt: r.claimedAt,
      });
    });
  });
  return list;
});

const filtered = computed(() => all.value.filter(x => x.status === tab.value));

const counts = computed(() => ({
  available: all.value.filter(x => x.status === 'available').length,
  locked: all.value.filter(x => x.status === 'locked').length,
  claimed: all.value.filter(x => x.status === 'claimed').length,
}));
</script>

<template>
  <div class="rewards">
    <!-- 头部统计 -->
    <section class="reward-hero card">
      <div class="reward-hero__bg"></div>
      <div class="reward-hero__content">
        <div class="reward-hero__title">
          <Sparkles :size="14" :stroke-width="2" />
          奖励中心
        </div>
        <h1>每一次坚持，都值得一份小确幸</h1>
        <p>《原子习惯》主张「让奖励即时可见」，把激励嵌入习惯的最末端</p>
      </div>
      <div class="reward-hero__stats">
        <div class="r-stat r-stat--mint">
          <div class="r-stat__num num">{{ counts.available }}</div>
          <div class="r-stat__label">可领取</div>
        </div>
        <div class="r-stat r-stat--brand">
          <div class="r-stat__num num">{{ counts.locked }}</div>
          <div class="r-stat__label">解锁中</div>
        </div>
        <div class="r-stat r-stat--peach">
          <div class="r-stat__num num">{{ counts.claimed }}</div>
          <div class="r-stat__label">已领取</div>
        </div>
      </div>
    </section>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ 'tab--active': tab === 'available' }" @click="tab = 'available'">
        <Gift :size="14" :stroke-width="2" />
        可领取
        <span class="tab__count num">{{ counts.available }}</span>
      </button>
      <button class="tab" :class="{ 'tab--active': tab === 'locked' }" @click="tab = 'locked'">
        <Lock :size="14" :stroke-width="2" />
        解锁中
        <span class="tab__count num">{{ counts.locked }}</span>
      </button>
      <button class="tab" :class="{ 'tab--active': tab === 'claimed' }" @click="tab = 'claimed'">
        <Award :size="14" :stroke-width="2" />
        已领取
        <span class="tab__count num">{{ counts.claimed }}</span>
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="filtered.length === 0" class="empty card card--padded-lg">
      <div class="empty__icon"><Gift :size="22" :stroke-width="2" /></div>
      <div class="empty__title">{{ tab === 'available' ? '暂无可领取奖励' : tab === 'locked' ? '所有奖励均已解锁' : '尚未领取任何奖励' }}</div>
      <div class="empty__desc">在目标详情页可以为每个目标自定义阶段奖励</div>
    </div>

    <div v-else class="reward-grid">
      <div
        v-for="item in filtered"
        :key="item.rewardId"
        class="r-card card card--hover"
        :class="`r-card--${item.status} r-card--${item.goalColor}`"
      >
        <div class="r-card__head">
          <div class="r-card__icon">{{ item.goalIcon }}</div>
          <div>
            <div class="r-card__from">来自目标</div>
            <div class="r-card__goal">{{ item.goalName }}</div>
          </div>
        </div>
        <div class="r-card__body">
          <div class="r-card__name">{{ item.rewardName }}</div>
          <p class="r-card__content">{{ item.rewardContent }}</p>
          <div class="r-card__trigger">{{ item.triggerLabel }}</div>
        </div>
        <button v-if="item.status === 'available'" class="btn btn--primary btn--block" @click="store.claimReward(item.goalId, item.rewardId)">
          立即领取
        </button>
        <div v-else-if="item.status === 'claimed'" class="r-card__claimed">
          <Award :size="14" :stroke-width="2" /> 已于 {{ item.claimedAt }} 领取
        </div>
        <div v-else class="r-card__locked">
          <Lock :size="13" :stroke-width="2" /> 待解锁
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rewards {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.reward-hero {
  position: relative;
  padding: var(--space-8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  overflow: hidden;
  background: var(--gradient-aurora);
  border: 1px solid var(--border-subtle);
}
.reward-hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 88% 18%, rgba(125, 203, 179, 0.18), transparent 40%),
    radial-gradient(circle at 12% 82%, rgba(168, 155, 217, 0.18), transparent 40%);
  pointer-events: none;
}
.reward-hero__content { position: relative; z-index: 1; }
.reward-hero__title {
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
  margin-bottom: var(--space-3);
}
.reward-hero__content h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  margin-bottom: 6px;
}
.reward-hero__content p {
  font-size: var(--text-md);
  color: var(--text-secondary);
}
.reward-hero__stats {
  position: relative;
  display: flex;
  gap: var(--space-3);
}
.r-stat {
  padding: var(--space-4) var(--space-5);
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  text-align: center;
  min-width: 96px;
}
.r-stat__num {
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1;
}
.r-stat--mint .r-stat__num { color: var(--mint); }
.r-stat--brand .r-stat__num { color: var(--brand-active); }
.r-stat--peach .r-stat__num { color: var(--peach); }
.r-stat__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 6px;
  letter-spacing: 0.4px;
}

.tabs {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px var(--space-3);
  font-size: var(--text-md);
  color: var(--text-tertiary);
  font-weight: 500;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab:hover { color: var(--text-secondary); }
.tab--active {
  color: var(--brand-active);
  border-bottom-color: var(--brand);
}
.tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--bg-soft);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: 600;
}
.tab--active .tab__count { background: var(--brand-soft); color: var(--brand-active); }

.reward-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}
.r-card {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  position: relative;
  overflow: hidden;
}
.r-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.r-card--brand::before { background: var(--gradient-brand); }
.r-card--mint::before { background: var(--gradient-mint); }
.r-card--lavender::before { background: var(--gradient-lavender); }
.r-card--peach::before { background: var(--gradient-peach); }

.r-card--available { background: var(--mint-soft); border-color: rgba(125, 203, 179, 0.3); }
.r-card--locked { opacity: 0.85; }
.r-card--claimed { background: var(--surface); }

.r-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.r-card__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 1px solid var(--border-subtle);
}
.r-card__from {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.4px;
}
.r-card__goal {
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: 500;
}

.r-card__body { flex: 1; }
.r-card__name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}
.r-card__content {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: 4px;
}
.r-card__trigger {
  display: inline-block;
  padding: 3px 10px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
}

.r-card__claimed,
.r-card__locked {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: var(--space-2) 0;
}
.r-card__claimed { color: var(--peach); }
.r-card__locked { color: var(--text-tertiary); }

@media (max-width: 768px) {
  .reward-hero { flex-direction: column; padding: var(--space-5); align-items: flex-start; }
  .reward-hero__stats { width: 100%; }
  .r-stat { flex: 1; min-width: 0; }
}
</style>
