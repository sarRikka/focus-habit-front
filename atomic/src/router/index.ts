import { createRouter, createWebHashHistory } from 'vue-router';
import { useAppStore } from '../stores/app';
import { getTokens, isRemote } from '../api/http';

const routes = [
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: '今日' } },
  { path: '/goals', name: 'goals', component: () => import('../views/GoalsView.vue'), meta: { title: '目标' } },
  { path: '/goals/new', name: 'goal-new', component: () => import('../views/GoalCreateView.vue'), meta: { title: '创建目标' } },
  { path: '/goals/:id', name: 'goal-detail', component: () => import('../views/GoalDetailView.vue'), meta: { title: '目标详情' } },
  { path: '/checkin', name: 'checkin', component: () => import('../views/CheckinView.vue'), meta: { title: '打卡' } },
  { path: '/checkin/:id', name: 'checkin-goal', component: () => import('../views/CheckinView.vue'), meta: { title: '打卡' } },
  { path: '/rewards', name: 'rewards', component: () => import('../views/RewardsView.vue'), meta: { title: '奖励' } },
  { path: '/review', name: 'review', component: () => import('../views/ReviewView.vue'), meta: { title: '复盘' } },
  { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { title: '我的' } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: '设置' } },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: '登录' } },
  { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { title: '注册' } },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  if (!isRemote) return true;

  if (to.path === '/login' || to.path === '/register') {
    const store = useAppStore();
    if (store.remoteReady && store.profile.isGuest === false) {
      return { path: '/', replace: true };
    }
    return true;
  }

  const guestOff = import.meta.env.VITE_ENABLE_GUEST === '0';
  if (guestOff && !getTokens()?.access_token) {
    const allowAuthPages = to.path === '/login' || to.path === '/register';
    if (!allowAuthPages) {
      return { path: '/login', replace: true };
    }
  }

  return true;
});
