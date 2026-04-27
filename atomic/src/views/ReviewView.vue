<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  Plus, BookOpen, Calendar, Star, Trash2, Sparkles, Lightbulb,
  TrendingUp, BarChart3, Target as TargetIcon,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { todayStr } from '../composables/utils';
import Modal from '../components/Modal.vue';
import type { ReviewReport } from '../types';

const store = useAppStore();

type Tab = 'all' | 'weekly' | 'monthly' | 'manual';
const tab = ref<Tab>('all');

const filtered = computed(() => {
  if (tab.value === 'all') return store.reviews;
  return store.reviews.filter(r => r.type === tab.value);
});

const guideQuestions = [
  '本周/本月哪些时段最容易完成打卡？背后的原因是什么？',
  '中断或低谷出现在什么场景？下次如何用「习惯堆叠」化解？',
  '哪些细节让你坚持下来？哪些奖励/反馈最有效？',
];

const showAdd = ref(false);
const form = reactive({
  goalId: '',
  date: todayStr(),
  content: '',
});

function submit() {
  if (!form.content.trim()) return;
  const goal = form.goalId ? store.getGoal(form.goalId) : null;
  store.addReview({
    type: 'manual',
    title: goal ? `复盘 · ${goal.name}` : '复盘随笔',
    date: form.date,
    goalId: form.goalId || undefined,
    goalName: goal?.name,
    content: form.content.trim(),
  });
  form.content = '';
  showAdd.value = false;
}

const overall = computed(() => {
  return store.reviews.filter(r => r.metrics).slice(0, 8).reverse();
});

// 趋势图至少需要 2 个数据点才有意义
const showTrend = computed(() => overall.value.length >= 2);

const trendWidth = computed(() => Math.max(1, overall.value.length - 1) * 60);
const trendPoints = computed(() =>
  overall.value.map((r, i) => `${i * 60},${120 - r.metrics!.checkinRate * 1.05}`).join(' '),
);
const trendArea = computed(() => {
  if (overall.value.length === 0) return '';
  const linePoints = overall.value
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${i * 60} ${120 - r.metrics!.checkinRate * 1.05}`)
    .join(' ');
  return `${linePoints} L ${trendWidth.value} 120 L 0 120 Z`;
});

function typeLabel(t: ReviewReport['type']) {
  return t === 'weekly' ? '周报' : t === 'monthly' ? '月报' : '手动';
}
</script>

<template>
  <div class="review">
    <!-- Hero -->
    <section class="r-hero card">
      <div class="r-hero__bg"></div>
      <div class="r-hero__content">
        <div class="r-hero__title"><BookOpen :size="14" :stroke-width="2" /> 复盘中心</div>
        <h1>看见微小坚持背后的轨迹</h1>
        <p>每一次复盘，都是与自己的真诚对话 — 不评判，只看见</p>
      </div>
      <button class="btn btn--primary" @click="showAdd = true">
        <Plus :size="16" :stroke-width="2.4" /> 添加复盘
      </button>
    </section>

    <!-- 趋势图 -->
    <section v-if="showTrend" class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3><TrendingUp :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 趋势走向</h3>
          <span class="section-title__sub">最近 {{ overall.length }} 份报告的核心数据</span>
        </div>
      </div>
      <div class="trend">
        <div class="trend__chart">
          <svg :viewBox="`0 0 ${trendWidth} 120`" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trend-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#8FAEE6" stop-opacity="0.34" />
                <stop offset="100%" stop-color="#8FAEE6" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="trendArea" fill="url(#trend-grad)" />
            <polyline
              :points="trendPoints"
              fill="none"
              stroke="#8FAEE6"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              v-for="(r, i) in overall"
              :key="i"
              :cx="i * 60"
              :cy="120 - r.metrics!.checkinRate * 1.05"
              r="3.6"
              fill="#fff"
              stroke="#7B9DDB"
              stroke-width="2"
            />
          </svg>
          <div class="trend__labels">
            <div v-for="(r, i) in overall" :key="i" class="trend__label">
              <div class="trend__rate num">{{ r.metrics!.checkinRate }}%</div>
              <div class="trend__date">{{ r.date.slice(5) }}</div>
            </div>
          </div>
        </div>
        <div class="trend__legend">
          <BarChart3 :size="14" :stroke-width="2" />
          <span>打卡率走势 · 数据基于 {{ overall.length }} 份复盘报告自动汇总</span>
        </div>
      </div>
    </section>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ 'tab--active': tab === 'all' }" @click="tab = 'all'">全部</button>
      <button class="tab" :class="{ 'tab--active': tab === 'weekly' }" @click="tab = 'weekly'">周报</button>
      <button class="tab" :class="{ 'tab--active': tab === 'monthly' }" @click="tab = 'monthly'">月报</button>
      <button class="tab" :class="{ 'tab--active': tab === 'manual' }" @click="tab = 'manual'">手动复盘</button>
    </div>

    <!-- 列表 -->
    <div v-if="filtered.length === 0" class="empty card card--padded-lg">
      <div class="empty__icon"><BookOpen :size="22" :stroke-width="2" /></div>
      <div class="empty__title">暂无复盘记录</div>
      <div class="empty__desc">每周日 19:00 自动生成报告，也可以随时手动添加</div>
    </div>

    <div v-else class="review-list">
      <article v-for="r in filtered" :key="r.id" class="review-card card card--hover">
        <div class="review-card__head">
          <div class="review-card__meta">
            <span class="tag" :class="r.type === 'weekly' ? 'tag--brand' : r.type === 'monthly' ? 'tag--lavender' : 'tag--mint'">
              {{ typeLabel(r.type) }}
            </span>
            <span v-if="r.goalName" class="review-card__goal"><TargetIcon :size="11" :stroke-width="2" /> {{ r.goalName }}</span>
            <span class="review-card__date"><Calendar :size="11" :stroke-width="2" /> {{ r.date }}</span>
          </div>
          <div class="review-card__actions">
            <button class="btn btn--ghost btn--icon btn--sm" :class="{ 'is-active': r.isFavorite }" @click="store.toggleReviewFavorite(r.id)">
              <Star :size="14" :stroke-width="2" :fill="r.isFavorite ? '#E8C97D' : 'none'" />
            </button>
            <button class="btn btn--ghost btn--icon btn--sm" @click="store.deleteReview(r.id)">
              <Trash2 :size="14" :stroke-width="2" />
            </button>
          </div>
        </div>

        <h3 class="review-card__title">{{ r.title }}</h3>

        <div v-if="r.metrics" class="review-card__metrics">
          <div class="m">
            <div class="m__num num">{{ r.metrics.checkinRate }}%</div>
            <div class="m__label">打卡率</div>
          </div>
          <div class="m">
            <div class="m__num num">{{ r.metrics.avgDuration }}<span>分</span></div>
            <div class="m__label">日均时长</div>
          </div>
          <div class="m">
            <div class="m__num num">+{{ r.metrics.progressDelta }}%</div>
            <div class="m__label">进度提升</div>
          </div>
          <div class="m">
            <div class="m__num num">{{ r.metrics.missedDays }}</div>
            <div class="m__label">未打卡天</div>
          </div>
          <div class="m">
            <div class="m__num num">{{ r.metrics.totalMinutes }}<span>分</span></div>
            <div class="m__label">累计投入</div>
          </div>
        </div>

        <p v-if="r.content" class="review-card__content">{{ r.content }}</p>

        <div v-if="r.suggestions && r.suggestions.length" class="review-card__suggestions">
          <div class="sug-title"><Lightbulb :size="14" :stroke-width="2" /> 调整建议</div>
          <ul>
            <li v-for="(s, i) in r.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>
      </article>
    </div>

    <!-- 添加复盘 -->
    <Modal :open="showAdd" title="添加复盘" desc="给自己一份诚实而温柔的回望" :width="560" @close="showAdd = false">
      <div class="form-row">
        <div class="form__field">
          <label class="form__label">关联目标（可选）</label>
          <select v-model="form.goalId" class="select">
            <option value="">— 通用复盘 —</option>
            <option v-for="g in store.activeGoals" :key="g.id" :value="g.id">{{ g.icon }} {{ g.name }}</option>
          </select>
        </div>
        <div class="form__field">
          <label class="form__label">日期</label>
          <input v-model="form.date" type="date" class="input" />
        </div>
      </div>

      <div class="form__field">
        <label class="form__label">复盘内容</label>
        <textarea
          v-model="form.content"
          class="textarea"
          rows="5"
          placeholder="自由输入，或参考下方引导问题…"
        ></textarea>
      </div>

      <div class="guides">
        <div class="guides__title"><Sparkles :size="13" :stroke-width="2" /> 引导问题</div>
        <ol>
          <li v-for="(q, i) in guideQuestions" :key="i">{{ q }}</li>
        </ol>
      </div>

      <template #footer>
        <button class="btn btn--ghost" @click="showAdd = false">取消</button>
        <button class="btn btn--primary" :disabled="!form.content.trim()" @click="submit">保存归档</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.r-hero {
  position: relative;
  padding: var(--space-8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  overflow: hidden;
  background: var(--gradient-aurora);
  border: 1px solid var(--border-subtle);
}
.r-hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 90% 20%, rgba(168, 155, 217, 0.18), transparent 40%),
    radial-gradient(circle at 10% 80%, rgba(125, 203, 179, 0.16), transparent 40%);
  pointer-events: none;
}
.r-hero__content { position: relative; z-index: 1; }
.r-hero__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}
.r-hero__content h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  margin-bottom: 6px;
}
.r-hero__content p {
  font-size: var(--text-md);
  color: var(--text-secondary);
}

/* Trend chart */
.trend {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.trend__chart {
  position: relative;
  width: 100%;
  height: 180px;
  padding: var(--space-3) var(--space-2) 30px;
}
.trend__chart svg {
  width: 100%;
  height: 100%;
  display: block;
}
.trend__labels {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 var(--space-2);
}
.trend__label {
  text-align: center;
  flex: 1;
}
.trend__rate {
  font-size: var(--text-xs);
  color: var(--brand-active);
  font-weight: 600;
}
.trend__date {
  font-size: 10px;
  color: var(--text-tertiary);
}
.trend__legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.tabs {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}
.tab {
  padding: 10px var(--space-3);
  font-size: var(--text-md);
  color: var(--text-tertiary);
  font-weight: 500;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab:hover { color: var(--text-secondary); }
.tab--active { color: var(--brand-active); border-bottom-color: var(--brand); }

.review-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.review-card {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.review-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.review-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.review-card__goal,
.review-card__date {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
.review-card__actions { display: flex; gap: 2px; }
.is-active { color: var(--peach); }

.review-card__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

.review-card__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--bg-soft);
  border-radius: var(--radius-md);
}
.m {
  text-align: center;
}
.m__num {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.m__num span {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: 500;
  margin-left: 2px;
}
.m__label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.review-card__content {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-line;
  padding: var(--space-3) var(--space-4);
  background: var(--surface-elevated);
  border-left: 3px solid var(--brand-border);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.review-card__suggestions {
  background: var(--brand-softer);
  border: 1px solid var(--brand-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}
.sug-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--brand-active);
  font-weight: 600;
  margin-bottom: 6px;
}
.review-card__suggestions ul {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.7;
  padding-left: var(--space-5);
  list-style: disc;
}

/* Modal form */
.form-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--space-3); }
.form__field { margin-bottom: var(--space-4); }
.form__label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.guides {
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}
.guides__title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: var(--space-2);
}
.guides ol {
  list-style: decimal;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 768px) {
  .r-hero { flex-direction: column; padding: var(--space-5); align-items: flex-start; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
