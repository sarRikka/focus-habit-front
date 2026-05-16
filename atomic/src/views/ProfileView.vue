<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Edit3, Sparkles, Award, Flame, Calendar, Settings as SettingsIcon,
  Target as TargetIcon, Gift, Archive, Smartphone, LogOut, UserPlus,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { isRemote } from '../api/http';
import Modal from '../components/Modal.vue';
import { formatDate } from '../composables/utils';

const router = useRouter();
const store = useAppStore();
const loggingOut = ref(false);

async function onLogout() {
  loggingOut.value = true;
  try {
    await store.logoutAccount();
  } finally {
    loggingOut.value = false;
  }
}

const showEdit = ref(false);
const editingNickname = ref(store.profile.nickname);

function saveProfile() {
  store.updateProfile({ nickname: editingNickname.value.trim() || store.profile.nickname });
  showEdit.value = false;
  store.showToast({ type: 'success', title: '资料已更新' });
}

const stats = computed(() => [
  { label: '进行中目标', value: store.activeGoals.length, icon: TargetIcon, color: 'brand' },
  { label: '累计打卡天数', value: store.profile.totalCheckinDays, icon: Calendar, color: 'mint' },
  { label: '已固化习惯', value: store.profile.fixedHabitsCount, icon: Sparkles, color: 'lavender' },
  { label: '连续天数', value: store.continuousDays, icon: Flame, color: 'peach' },
]);

const achievements = computed(() => [
  { name: '原子坚持者', desc: '完成 7 天连续打卡', earned: store.continuousDays >= 7, icon: '🌱' },
  { name: '早起初心人', desc: '在早起类目标累计 10 次打卡', earned: true, icon: '🌅' },
  { name: '复利信徒', desc: '完成 30 天连续打卡', earned: store.continuousDays >= 30, icon: '🔥' },
  { name: '阶段攻克者', desc: '完成至少 1 个阶段目标', earned: store.goals.some(g => g.phases.some(p => p.completed)), icon: '🎯' },
  { name: '习惯掌控者', desc: '至少固化一个习惯', earned: store.profile.fixedHabitsCount > 0, icon: '✨' },
  { name: '复盘记录人', desc: '完成至少 3 份复盘', earned: store.reviews.length >= 3, icon: '📒' },
]);
</script>

<template>
  <div class="profile">
    <!-- Hero -->
    <section class="p-hero card">
      <div class="p-hero__bg"></div>
      <div class="p-hero__main">
        <div class="avatar">{{ store.profile.nickname.slice(0, 1) }}</div>
        <div class="p-hero__info">
          <div class="p-hero__name">
            <h1>{{ store.profile.nickname }}</h1>
            <button class="btn btn--ghost btn--icon btn--sm" @click="showEdit = true; editingNickname = store.profile.nickname">
              <Edit3 :size="14" :stroke-width="2" />
            </button>
          </div>
          <div class="p-hero__joined">加入于 {{ formatDate(store.profile.joinedAt, 'CN') }}</div>
          <div class="p-hero__badges">
            <span v-for="b in store.profile.badges" :key="b" class="tag tag--lavender">
              <Sparkles :size="11" :stroke-width="2" /> {{ b }}
            </span>
          </div>
        </div>
        <button class="btn btn--outline" @click="router.push('/settings')">
          <SettingsIcon :size="14" :stroke-width="2" /> 设置
        </button>
      </div>
    </section>

    <!-- 账号（remote 可走服务端登录；mock 仅本地数据） -->
    <section class="card card--padded account">
      <div class="section-title">
        <div class="section-title__main">
          <h3><Smartphone :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 账号</h3>
          <span class="section-title__sub">
            <template v-if="!isRemote">本地演示 · 未连接后端</template>
            <template v-else-if="store.profile.isGuest === true">游客模式 · 建议使用账号登录</template>
            <template v-else-if="store.profile.isGuest === false">已登录</template>
            <template v-else>同步后即可查看登录状态</template>
          </span>
        </div>
      </div>
      <p v-if="!isRemote" class="account__mock-hint">
        当前为本地数据模式。要使用账号登录，请在 <span class="mono">atomic/.env.development</span> 中将
        <span class="mono">VITE_DATA_SOURCE</span> 设为 <span class="mono">remote</span>，保存后<strong>重启</strong>前端开发服务（例如重新执行 <span class="mono">npm run dev</span>）。
      </p>
      <div v-else class="account__actions">
        <template v-if="store.profile.isGuest !== false">
          <button
            type="button"
            class="btn btn--primary"
            @click="router.push('/login')"
          >
            <Smartphone :size="14" :stroke-width="2" /> 登录
          </button>
          <button
            type="button"
            class="btn btn--outline"
            @click="router.push('/register')"
          >
            <UserPlus :size="14" :stroke-width="2" /> 注册
          </button>
        </template>
        <button
          v-else
          type="button"
          class="btn btn--outline"
          :disabled="loggingOut"
          @click="onLogout"
        >
          <LogOut :size="14" :stroke-width="2" /> {{ loggingOut ? '退出中…' : '退出登录' }}
        </button>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats">
      <div v-for="s in stats" :key="s.label" class="stat-card card card--padded">
        <div class="stat-card__icon" :class="`stat-card__icon--${s.color}`">
          <component :is="s.icon" :size="16" :stroke-width="2" />
        </div>
        <div>
          <div class="stat-card__num num">{{ s.value }}</div>
          <div class="stat-card__label">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <!-- 成就 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3><Award :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 身份徽章</h3>
          <span class="section-title__sub">{{ achievements.filter(a => a.earned).length }} / {{ achievements.length }} 已点亮</span>
        </div>
      </div>
      <div class="badge-grid">
        <div v-for="a in achievements" :key="a.name" class="badge" :class="{ 'badge--earned': a.earned }">
          <div class="badge__icon">{{ a.icon }}</div>
          <div class="badge__name">{{ a.name }}</div>
          <div class="badge__desc">{{ a.desc }}</div>
        </div>
      </div>
    </section>

    <!-- 历史目标 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3><Archive :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 我的目标</h3>
          <span class="section-title__sub">{{ store.goals.length }} 个目标 · {{ store.fixedGoals.length }} 已固化</span>
        </div>
        <RouterLink to="/goals" class="link">查看全部 →</RouterLink>
      </div>

      <div class="history-list">
        <RouterLink
          v-for="g in store.goals.slice(0, 5)"
          :key="g.id"
          :to="`/goals/${g.id}`"
          class="history-item"
        >
          <div class="history-item__icon" :class="`history-item__icon--${g.color}`">{{ g.icon }}</div>
          <div class="history-item__main">
            <div class="history-item__name">{{ g.name }}</div>
            <div class="history-item__sub">
              {{ g.fixed ? '已固化' : g.archived ? '已归档' : '进行中' }} · 进度 {{ g.progress }}%
            </div>
          </div>
          <div class="history-item__icons">
            <span class="hi-stat"><Calendar :size="12" :stroke-width="2" /> {{ Object.keys(g.checkins).length }}</span>
            <span class="hi-stat"><Gift :size="12" :stroke-width="2" /> {{ g.rewards.length }}</span>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 编辑资料 -->
    <Modal :open="showEdit" title="编辑资料" @close="showEdit = false">
      <div class="form__field">
        <label class="form__label">昵称</label>
        <input v-model="editingNickname" class="input" maxlength="20" />
      </div>
      <template #footer>
        <button class="btn btn--ghost" @click="showEdit = false">取消</button>
        <button class="btn btn--primary" @click="saveProfile">保存</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.p-hero {
  position: relative;
  padding: var(--space-8);
  overflow: hidden;
  background: var(--gradient-aurora);
  border: 1px solid var(--border-subtle);
}
.p-hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 90% 0%, rgba(168, 155, 217, 0.16), transparent 40%),
    radial-gradient(circle at 0% 100%, rgba(125, 203, 179, 0.16), transparent 40%);
  pointer-events: none;
}
.p-hero__main {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-5);
}
.avatar {
  width: 78px;
  height: 78px;
  border-radius: var(--radius-full);
  background: var(--gradient-brand);
  color: var(--text-on-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(123, 157, 219, 0.3);
  border: 3px solid var(--surface);
}
.p-hero__info { flex: 1; min-width: 0; }
.p-hero__name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.p-hero__name h1 {
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}
.p-hero__joined {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin: 4px 0 var(--space-2);
}
.p-hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* stats */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}
.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.stat-card__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-card__icon--brand { background: var(--brand-soft); color: var(--brand-active); }
.stat-card__icon--mint { background: var(--mint-soft); color: var(--accent-mint); }
.stat-card__icon--lavender { background: var(--lavender-soft); color: var(--accent-lavender); }
.stat-card__icon--peach { background: var(--peach-soft); color: var(--accent-peach); }
.stat-card__num {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1;
}
.stat-card__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* badges */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-3);
}
.badge {
  text-align: center;
  padding: var(--space-4);
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  opacity: 0.55;
  transition: all var(--duration-base);
}
.badge--earned {
  opacity: 1;
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow-xs);
}
.badge__icon { font-size: 28px; margin-bottom: 4px; }
.badge__name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
}
.badge__desc {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 4px;
  line-height: 1.5;
}

/* history */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  transition: background var(--duration-fast);
}
.history-item:hover { background: var(--bg-soft); }
.history-item__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--bg-soft);
}
.history-item__icon--brand { background: var(--brand-soft); }
.history-item__icon--mint { background: var(--mint-soft); }
.history-item__icon--lavender { background: var(--lavender-soft); }
.history-item__icon--peach { background: var(--peach-soft); }
.history-item__main { flex: 1; min-width: 0; }
.history-item__name {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-item__sub {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}
.history-item__icons { display: flex; gap: var(--space-3); }
.hi-stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.link { font-size: var(--text-sm); color: var(--brand-active); }
.link:hover { color: var(--brand-hover); }

.account__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.account__mock-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}
.account__mock-hint .mono {
  font-family: ui-monospace, monospace;
  font-size: 0.92em;
  color: var(--text-primary);
}

.form__field { margin-bottom: var(--space-4); }
.form__label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

@media (max-width: 768px) {
  .p-hero { padding: var(--space-5); }
  .p-hero__main { flex-direction: column; align-items: flex-start; }
  .avatar { width: 64px; height: 64px; font-size: 26px; }
}
</style>
