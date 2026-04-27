import { createRouter, createWebHashHistory } from 'vue-router';

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
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
