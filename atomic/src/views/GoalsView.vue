<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, Inbox, Sparkles } from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import GoalCard from '../components/GoalCard.vue';

const router = useRouter();
const store = useAppStore();

type Tab = 'active' | 'fixed' | 'archived';
const tab = ref<Tab>('active');
const keyword = ref('');

const list = computed(() => {
  let arr = store.goals;
  if (tab.value === 'active') arr = arr.filter(g => !g.archived && !g.fixed);
  if (tab.value === 'fixed') arr = arr.filter(g => g.fixed);
  if (tab.value === 'archived') arr = arr.filter(g => g.archived);
  if (keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase();
    arr = arr.filter(g => g.name.toLowerCase().includes(k) || g.finalGoal.toLowerCase().includes(k));
  }
  return arr;
});

function buildTabs() {
  return [
    { key: 'active' as Tab, label: '进行中', count: store.goals.filter(g => !g.archived && !g.fixed).length },
    { key: 'fixed' as Tab, label: '已固化', count: store.goals.filter(g => g.fixed).length },
    { key: 'archived' as Tab, label: '已归档', count: store.goals.filter(g => g.archived).length },
  ];
}
</script>

<template>
  <div class="goals">
    <!-- 顶部：搜索 + 创建 -->
    <div class="goals__head card card--padded">
      <div class="goals__search">
        <Search :size="16" :stroke-width="2" />
        <input v-model="keyword" class="goals__input" placeholder="搜索目标名称或最终目标…" />
      </div>
      <button class="btn btn--primary" @click="router.push('/goals/new')">
        <Plus :size="16" :stroke-width="2.4" />
        <span>新建目标</span>
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="t in buildTabs()"
        :key="t.key"
        class="tab"
        :class="{ 'tab--active': tab === t.key }"
        @click="tab = t.key"
      >
        <span>{{ t.label }}</span>
        <span class="tab__count num">{{ t.count }}</span>
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="list.length === 0" class="empty card card--padded-lg">
      <div class="empty__icon">
        <component :is="tab === 'fixed' ? Sparkles : Inbox" :size="22" :stroke-width="2" />
      </div>
      <div class="empty__title">
        {{ tab === 'fixed' ? '尚未固化任何习惯，继续坚持' : tab === 'archived' ? '没有已归档的目标' : '从一个微小目标开始吧' }}
      </div>
      <div class="empty__desc">
        {{ tab === 'fixed' ? '进度达 100% 即视为习惯固化' : '原子习惯：每天进步 1%，一年成长 37 倍' }}
      </div>
      <button v-if="tab === 'active'" class="btn btn--primary" style="margin-top: 16px" @click="router.push('/goals/new')">
        <Plus :size="16" :stroke-width="2.4" /> 创建第一个目标
      </button>
    </div>

    <div v-else class="goal-grid">
      <GoalCard
        v-for="g in list"
        :key="g.id"
        :goal="g"
        @click="router.push(`/goals/${g.id}`)"
      />
    </div>
  </div>
</template>

<style scoped>
.goals {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.goals__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.goals__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  height: 38px;
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  transition: background var(--duration-fast);
}
.goals__search:focus-within {
  background: var(--surface);
  box-shadow: 0 0 0 2px var(--brand-soft);
  color: var(--brand);
}
.goals__input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-md);
}
.goals__input::placeholder { color: var(--text-tertiary); }

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
  transition: color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
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
.tab--active .tab__count {
  background: var(--brand-soft);
  color: var(--brand-active);
}

.goal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

@media (max-width: 768px) {
  .goals__head { flex-direction: column; align-items: stretch; }
}
</style>
