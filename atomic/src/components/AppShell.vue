<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard, Target, CheckCircle2, Gift, BookOpen, User,
  Settings, Sparkles, Plus,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { isRemote } from '../api/http';
import ToastContainer from './ToastContainer.vue';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const hideChrome = computed(() => route.path === '/login' || route.path === '/register');

const navItems = [
  { name: 'dashboard', label: '今日', icon: LayoutDashboard, path: '/' },
  { name: 'goals', label: '目标', icon: Target, path: '/goals' },
  { name: 'checkin', label: '打卡', icon: CheckCircle2, path: '/checkin' },
  { name: 'rewards', label: '奖励', icon: Gift, path: '/rewards' },
  { name: 'review', label: '复盘', icon: BookOpen, path: '/review' },
  { name: 'profile', label: '我的', icon: User, path: '/profile' },
];

const isActive = (path: string) => {
  if (path === '/') return route.path === '/';
  return route.path === path || route.path.startsWith(path + '/');
};

const pageTitle = computed(() => (route.meta.title as string) ?? 'Atomic');
</script>

<template>
  <div v-if="!isRemote || store.remoteReady">
    <template v-if="hideChrome">
      <RouterView />
      <ToastContainer />
    </template>
    <div v-else class="shell">
    <!-- 桌面端侧边导航 -->
    <aside class="shell__sidebar hide-mobile">
      <div class="brand">
        <div class="brand__mark">
          <Sparkles :size="18" :stroke-width="2" />
        </div>
        <div class="brand__text">
          <div class="brand__name">Atomic</div>
          <div class="brand__tag">微小坚持，复利改变</div>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="nav__item"
          :class="{ 'nav__item--active': isActive(item.path) }"
        >
          <component :is="item.icon" :size="18" :stroke-width="2" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="nav__divider"></div>

      <RouterLink to="/settings" class="nav__item" :class="{ 'nav__item--active': route.path === '/settings' }">
        <Settings :size="18" :stroke-width="2" />
        <span>设置</span>
      </RouterLink>

      <div class="sidebar-footer">
        <div class="streak">
          <div class="streak__num num">{{ store.continuousDays }}</div>
          <div class="streak__label">连续打卡 · 天</div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="shell__main">
      <header class="topbar">
        <div class="topbar__left">
          <h2 class="topbar__title">{{ pageTitle }}</h2>
        </div>
        <div class="topbar__right">
          <button class="btn btn--secondary btn--sm" @click="router.push('/goals/new')">
            <Plus :size="16" :stroke-width="2.2" />
            <span>新建目标</span>
          </button>
        </div>
      </header>

      <div class="shell__page">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>

      <!-- 移动端底部导航 -->
      <nav class="bottom-nav show-mobile">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="bottom-nav__item"
          :class="{ 'bottom-nav__item--active': isActive(item.path) }"
        >
          <component :is="item.icon" :size="20" :stroke-width="2" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </main>

    <ToastContainer />
  </div>
  </div>
  <div v-else class="app-loading">
    <div class="app-loading__inner">
      <div class="app-loading__spinner"></div>
      <p>正在连接服务…</p>
      <p v-if="store.remoteError" class="app-loading__err">{{ store.remoteError }}</p>
      <button
        v-if="isRemote && store.remoteError"
        type="button"
        class="btn btn--primary app-loading__retry"
        @click="router.push('/login')"
      >
        尝试登录
      </button>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
}

.shell__sidebar {
  width: var(--layout-sidebar);
  flex-shrink: 0;
  padding: var(--space-6) var(--space-4);
  border-right: 1px solid var(--border-subtle);
  background: var(--surface-elevated);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-2);
  margin-bottom: var(--space-8);
}
.brand__mark {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: var(--gradient-brand);
  color: var(--text-on-color);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(123, 157, 219, 0.28);
}
.brand__name {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: 0.6px;
  color: var(--text-primary);
}
.brand__tag {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.4px;
  margin-top: 1px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 9px var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  color: var(--text-secondary);
  font-weight: 500;
  letter-spacing: 0.2px;
  transition: background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}
.nav__item:hover {
  background: var(--bg-soft);
  color: var(--text-primary);
}
.nav__item--active {
  background: var(--brand-soft);
  color: var(--brand-active);
}
.nav__item--active svg {
  color: var(--brand);
}
.nav__divider {
  height: 1px;
  background: var(--border-subtle);
  margin: var(--space-4) var(--space-2);
}

.sidebar-footer {
  margin-top: auto;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--gradient-aurora);
  text-align: center;
}
.streak__num {
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: -0.5px;
  background: var(--gradient-streak);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.streak__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.6px;
  margin-top: 2px;
}

.shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-8);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-overlay);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}
.topbar__title {
  font-size: var(--text-2xl);
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--text-primary);
}

.shell__page {
  padding: var(--space-8);
  max-width: var(--layout-max-content);
  width: 100%;
  margin: 0 auto;
  flex: 1;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: var(--surface-overlay);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 1px solid var(--border-subtle);
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
  z-index: var(--z-sticky);
}
.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  padding: 6px 4px;
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 500;
  letter-spacing: 0.4px;
  transition: color var(--duration-fast) var(--ease-out);
}
.bottom-nav__item--active {
  color: var(--brand-active);
}
.bottom-nav__item--active svg {
  color: var(--brand);
}

.app-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
}
.app-loading__inner {
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--text-md);
}
.app-loading__spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--border);
  border-top-color: var(--brand);
  border-radius: 50%;
  margin: 0 auto var(--space-4);
  animation: spin 0.8s linear infinite;
}
.app-loading__err {
  color: var(--coral);
  font-size: var(--text-sm);
  margin-top: var(--space-2);
}
.app-loading__retry {
  margin-top: var(--space-4);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .topbar {
    padding: var(--space-4) var(--space-5);
  }
  .topbar__title {
    font-size: var(--text-xl);
  }
  .shell__page {
    padding: var(--space-5) var(--space-4) calc(var(--layout-bottom-nav) + var(--space-8));
  }
}
</style>
