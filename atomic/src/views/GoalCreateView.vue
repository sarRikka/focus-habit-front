<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ChevronLeft, ChevronRight, Check, Lightbulb,
  Plus, Trash2, AlertCircle,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { addDays, categoryPresets, goalIcons, todayStr, uid } from '../composables/utils';
import type { Goal, GoalCategory, PhaseTask } from '../types';

const router = useRouter();
const store = useAppStore();

const step = ref(1);
const totalSteps = 3;

interface FormState {
  category: GoalCategory;
  customCategoryName: string;
  name: string;
  finalGoal: string;
  coreNeed: string;
  deadline: string;
  totalDescription: string;
  phases: { name: string; description: string; totalMinutes: number; startDate: string; endDate: string }[];
  dailyDescription: string;
  dailyDuration: number;
  autoLevelUp: boolean;
  levelUpStep: number;
  icon: string;
  color: 'brand' | 'mint' | 'lavender' | 'peach';
}

const form = reactive<FormState>({
  category: 'habit',
  customCategoryName: '',
  name: '',
  finalGoal: '',
  coreNeed: '',
  deadline: addDays(todayStr(), 60),
  totalDescription: '',
  phases: [
    { name: '第 1 阶段', description: '', totalMinutes: 300, startDate: todayStr(), endDate: addDays(todayStr(), 30) },
    { name: '第 2 阶段', description: '', totalMinutes: 450, startDate: addDays(todayStr(), 30), endDate: addDays(todayStr(), 60) },
  ],
  dailyDescription: '',
  dailyDuration: 10,
  autoLevelUp: true,
  levelUpStep: 2,
  icon: '🎯',
  color: 'brand',
});

const colorOptions: { key: FormState['color']; name: string }[] = [
  { key: 'brand', name: '青蓝' },
  { key: 'mint', name: '薄荷' },
  { key: 'lavender', name: '柔紫' },
  { key: 'peach', name: '蜜桃' },
];

const overTime = computed(() => form.dailyDuration > 10);

function addPhase() {
  const idx = form.phases.length + 1;
  const last = form.phases[form.phases.length - 1];
  form.phases.push({
    name: `第 ${idx} 阶段`,
    description: '',
    totalMinutes: 300,
    startDate: last ? last.endDate : todayStr(),
    endDate: last ? addDays(last.endDate, 30) : addDays(todayStr(), 30),
  });
}
function removePhase(i: number) {
  if (form.phases.length <= 1) return;
  form.phases.splice(i, 1);
}

const stepValid = computed(() => {
  if (step.value === 1) {
    return !!form.name.trim()
      && !!form.finalGoal.trim()
      && !!form.coreNeed.trim()
      && !!form.deadline
      && form.deadline >= todayStr();
  }
  if (step.value === 2) {
    return form.phases.length > 0
      && form.phases.every(p =>
        p.name.trim()
          && p.description.trim()
          && p.startDate
          && p.endDate
          && p.endDate >= p.startDate
      );
  }
  if (step.value === 3) return !!form.dailyDescription.trim() && form.dailyDuration > 0;
  return false;
});

function next() {
  if (!stepValid.value) return;
  if (step.value < totalSteps) step.value++;
  else submit();
}
function back() {
  if (step.value > 1) step.value--;
  else router.back();
}

async function submit() {
  const phases: PhaseTask[] = form.phases.map(p => ({
    id: uid('p'),
    name: p.name,
    description: p.description,
    totalMinutes: p.totalMinutes,
    startDate: p.startDate,
    endDate: p.endDate,
    completed: false,
  }));
  const goal: Goal = {
    id: uid('g'),
    name: form.name.trim(),
    category: form.category,
    customCategoryName: form.category === 'custom' ? form.customCategoryName.trim() : undefined,
    finalGoal: form.finalGoal.trim(),
    coreNeed: form.coreNeed.trim(),
    deadline: form.deadline,
    createdAt: todayStr(),
    totalDescription: form.totalDescription.trim() || form.finalGoal.trim(),
    phases,
    dailyHabit: {
      description: form.dailyDescription.trim(),
      duration: form.dailyDuration,
      autoLevelUp: form.autoLevelUp,
      levelUpStep: form.levelUpStep,
    },
    checkins: {},
    rewards: [],
    progress: 0,
    manualDeduction: 0,
    archived: false,
    fixed: false,
    color: form.color,
    icon: form.icon,
  };
  try {
    const id = await store.addGoal(goal);
    router.push(`/goals/${id}`);
  } catch {
    /* addGoal 已 Toast */
  }
}
</script>

<template>
  <div class="create">
    <!-- 顶部导航 + 进度 -->
    <header class="create__head">
      <button class="back" @click="back">
        <ChevronLeft :size="18" :stroke-width="2" />
        <span>返回</span>
      </button>

      <div class="stepper">
        <div
          v-for="i in totalSteps"
          :key="i"
          class="stepper__step"
          :class="{ 'stepper__step--done': i < step, 'stepper__step--active': i === step }"
        >
          <div class="stepper__dot">
            <Check v-if="i < step" :size="14" :stroke-width="2.4" />
            <span v-else class="num">{{ i }}</span>
          </div>
          <div class="stepper__label">
            {{ ['基础信息', '阶段拆解', '每日习惯'][i - 1] }}
          </div>
          <div v-if="i < totalSteps" class="stepper__bar"></div>
        </div>
      </div>
    </header>

    <!-- 表单卡片 -->
    <div class="create__body">
      <!-- Step 1：基础信息 -->
      <section v-if="step === 1" class="card card--padded-lg form">
        <h2 class="form__title">先来明确这个目标</h2>
        <p class="form__sub">"明确具体的目标，让大脑无需费力寻找方向"</p>

        <div class="form__field">
          <label class="form__label">目标分类</label>
          <div class="cat-grid">
            <button
              v-for="c in categoryPresets"
              :key="c.key"
              class="cat-card"
              :class="{ 'cat-card--active': form.category === c.key, [`cat-card--${c.color}`]: true }"
              @click="form.category = c.key"
            >
              <div class="cat-card__name">{{ c.label }}</div>
              <div class="cat-card__desc">{{ c.desc }}</div>
            </button>
          </div>
          <input
            v-if="form.category === 'custom'"
            v-model="form.customCategoryName"
            class="input"
            placeholder="为这个分类起个名字"
            style="margin-top: var(--space-3)"
          />
        </div>

        <div class="form__row">
          <div class="form__field">
            <label class="form__label">目标名称 <span class="req">*</span></label>
            <input v-model="form.name" class="input" placeholder="例：每日早起 6:30" />
          </div>
          <div class="form__field">
            <label class="form__label">截止时间</label>
            <input v-model="form.deadline" type="date" class="input" />
          </div>
        </div>

        <div class="form__field">
          <label class="form__label">最终目标 <span class="req">*</span></label>
          <input v-model="form.finalGoal" class="input" placeholder="想要达到怎样的结果？" />
        </div>

        <div class="form__field">
          <label class="form__label">核心诉求（习惯固化判定标准）<span class="req">*</span></label>
          <textarea
            v-model="form.coreNeed"
            class="textarea"
            placeholder="进度达 100% 时，你希望已经具备的能力或状态…"
          ></textarea>
        </div>

        <div class="form__field">
          <label class="form__label">外观（可选）</label>
          <div class="visual">
            <div class="visual__group">
              <div class="visual__label">图标</div>
              <div class="icon-row">
                <button
                  v-for="i in goalIcons"
                  :key="i"
                  class="icon-btn"
                  :class="{ 'icon-btn--active': form.icon === i }"
                  @click="form.icon = i"
                >{{ i }}</button>
              </div>
            </div>
            <div class="visual__group">
              <div class="visual__label">配色</div>
              <div class="color-row">
                <button
                  v-for="c in colorOptions"
                  :key="c.key"
                  class="color-btn"
                  :class="[`color-btn--${c.key}`, { 'color-btn--active': form.color === c.key }]"
                  @click="form.color = c.key"
                ></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Step 2：阶段拆解 -->
      <section v-if="step === 2" class="card card--padded-lg form">
        <h2 class="form__title">把目标拆成可执行的阶段</h2>
        <p class="form__sub">"行动比意图更重要，把路标插在每一段路上"</p>

        <div class="hint card card--padded-sm">
          <Lightbulb :size="16" :stroke-width="2" />
          <div>
            <strong>拆解示例</strong>
            <span>能力提升类「3 个月掌握 Python」可拆为：第 1 月 基础语法 → 第 2 月 数据结构 → 第 3 月 综合练习</span>
          </div>
        </div>

        <div class="form__field">
          <label class="form__label">总事项描述</label>
          <textarea
            v-model="form.totalDescription"
            class="textarea"
            rows="2"
            placeholder="一句话描述这个目标整体要做什么"
          ></textarea>
        </div>

        <div class="phase-list">
          <div v-for="(p, i) in form.phases" :key="i" class="phase-item card card--padded">
            <div class="phase-item__head">
              <input v-model="p.name" class="phase-item__name input" />
              <button v-if="form.phases.length > 1" class="btn btn--ghost btn--icon" @click="removePhase(i)">
                <Trash2 :size="14" :stroke-width="2" />
              </button>
            </div>
            <textarea
              v-model="p.description"
              class="textarea"
              rows="2"
              placeholder="阶段事项：本阶段需要完成什么"
            ></textarea>
            <div class="phase-item__row">
              <div class="form__field">
                <label class="form__label">起始日期</label>
                <input v-model="p.startDate" type="date" class="input" />
              </div>
              <div class="form__field">
                <label class="form__label">截止日期</label>
                <input v-model="p.endDate" type="date" class="input" />
              </div>
              <div class="form__field">
                <label class="form__label">阶段总时长（分钟）</label>
                <input v-model.number="p.totalMinutes" type="number" min="0" class="input" />
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn--secondary btn--block" @click="addPhase">
          <Plus :size="16" :stroke-width="2.2" /> 添加新阶段
        </button>
      </section>

      <!-- Step 3：每日习惯 -->
      <section v-if="step === 3" class="card card--padded-lg form">
        <h2 class="form__title">设定一个微小的每日习惯</h2>
        <p class="form__sub">"原子习惯：让事情简单到不可能拒绝"</p>

        <div class="form__field">
          <label class="form__label">每日具体事项 <span class="req">*</span></label>
          <textarea
            v-model="form.dailyDescription"
            class="textarea"
            rows="2"
            placeholder="例：晚上 7 点学 Python 10 分钟，做 1 道练习题"
          ></textarea>
        </div>

        <div class="form__row">
          <div class="form__field">
            <label class="form__label">每日时长（分钟）</label>
            <input v-model.number="form.dailyDuration" type="number" min="1" class="input" />
            <div v-if="overTime" class="warn">
              <AlertCircle :size="14" :stroke-width="2" />
              <span>时长不宜过长，确保每天可完成</span>
            </div>
          </div>
        </div>

        <div class="form__field">
          <label class="check-row">
            <input v-model="form.autoLevelUp" type="checkbox" class="check" />
            <div>
              <div class="check-row__title">自动进阶</div>
              <div class="check-row__sub">每连续打卡 7 天，自动增加每日时长</div>
            </div>
          </label>
        </div>

        <div v-if="form.autoLevelUp" class="form__field">
          <label class="form__label">进阶幅度</label>
          <div class="seg">
            <button
              v-for="n in [1, 2, 3, 5]"
              :key="n"
              class="seg__btn"
              :class="{ 'seg__btn--active': form.levelUpStep === n }"
              @click="form.levelUpStep = n"
            >+{{ n }} 分钟</button>
          </div>
        </div>

        <!-- 预览 -->
        <div class="preview card--padded card">
          <div class="preview__head">预览</div>
          <div class="preview__row" :class="`preview__row--${form.color}`">
            <div class="preview__icon">{{ form.icon }}</div>
            <div>
              <div class="preview__name">{{ form.name || '目标名称' }}</div>
              <div class="preview__desc">{{ form.dailyDescription || '每日事项' }} · {{ form.dailyDuration }} 分钟 / 天</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 底部操作 -->
    <footer class="create__foot">
      <button class="btn btn--ghost" @click="back">{{ step === 1 ? '取消' : '上一步' }}</button>
      <button class="btn btn--primary" :disabled="!stepValid" @click="next">
        {{ step === totalSteps ? '完成创建' : '下一步' }}
        <ChevronRight v-if="step !== totalSteps" :size="16" :stroke-width="2.2" />
      </button>
    </footer>
  </div>
</template>

<style scoped>
.create {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: 880px;
  margin: 0 auto;
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.create__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  width: fit-content;
}
.back:hover { color: var(--text-primary); }

.stepper {
  display: flex;
  align-items: center;
  gap: 0;
}
.stepper__step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}
.stepper__dot {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--bg-soft);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: all var(--duration-base) var(--ease-out);
  flex-shrink: 0;
}
.stepper__step--done .stepper__dot {
  background: var(--brand-soft);
  color: var(--brand-active);
}
.stepper__step--active .stepper__dot {
  background: var(--brand);
  color: #fff;
  box-shadow: 0 0 0 4px var(--brand-soft);
}
.stepper__label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-weight: 500;
  white-space: nowrap;
}
.stepper__step--active .stepper__label { color: var(--text-primary); }
.stepper__step--done .stepper__label { color: var(--brand-active); }
.stepper__bar {
  flex: 1;
  height: 1px;
  background: var(--border);
  margin: 0 var(--space-3);
}
.stepper__step--done + .stepper__step .stepper__bar,
.stepper__step--done .stepper__bar { background: var(--brand-border); }

.form {
  animation: slide-up var(--duration-slow) var(--ease-out);
}
.form__title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  margin-bottom: 6px;
}
.form__sub {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-6);
  letter-spacing: 0.2px;
}
.form__field {
  margin-bottom: var(--space-5);
}
.form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.form__row .form__field { margin-bottom: 0; }
.form__label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.req { color: var(--coral); margin-left: 2px; }

/* category */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
}
.cat-card {
  text-align: left;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  transition: all var(--duration-fast) var(--ease-out);
}
.cat-card:hover { border-color: var(--border-strong); }
.cat-card--active {
  border-color: var(--brand);
  background: var(--brand-softer);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.cat-card--mint.cat-card--active { border-color: var(--mint); background: var(--mint-soft); box-shadow: 0 0 0 3px rgba(125, 203, 179, 0.16); }
.cat-card--lavender.cat-card--active { border-color: var(--lavender); background: var(--lavender-soft); box-shadow: 0 0 0 3px rgba(168, 155, 217, 0.16); }
.cat-card--peach.cat-card--active { border-color: var(--peach); background: var(--peach-soft); box-shadow: 0 0 0 3px rgba(240, 185, 138, 0.16); }
.cat-card__name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.cat-card__desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* visual */
.visual { display: flex; gap: var(--space-6); flex-wrap: wrap; }
.visual__group { flex: 1; min-width: 200px; }
.visual__label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-2);
}
.icon-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--bg-soft);
  font-size: 18px;
  transition: all var(--duration-fast);
}
.icon-btn:hover { background: var(--brand-soft); }
.icon-btn--active {
  background: var(--brand-soft);
  box-shadow: 0 0 0 2px var(--brand);
}
.color-row { display: flex; gap: var(--space-2); }
.color-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  position: relative;
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px var(--border);
  transition: box-shadow var(--duration-fast);
}
.color-btn--brand { background: var(--gradient-brand); }
.color-btn--mint { background: var(--gradient-mint); }
.color-btn--lavender { background: var(--gradient-lavender); }
.color-btn--peach { background: var(--gradient-peach); }
.color-btn--active { box-shadow: 0 0 0 2px var(--brand); }

/* hint */
.hint {
  display: flex;
  gap: var(--space-3);
  background: var(--brand-softer);
  border: 1px solid var(--brand-border);
  color: var(--brand-active);
  margin-bottom: var(--space-5);
  align-items: flex-start;
}
.hint > svg { flex-shrink: 0; margin-top: 2px; }
.hint strong {
  display: block;
  font-weight: 600;
  font-size: var(--text-sm);
  margin-bottom: 2px;
}
.hint span {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.55;
}

/* phases */
.phase-list { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-3); }
.phase-item {
  background: var(--bg-soft);
  border-color: transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.phase-item__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.phase-item__name {
  flex: 1;
  background: transparent;
  border-color: transparent;
  font-size: var(--text-md);
  font-weight: 600;
  padding-left: 0;
  height: 32px;
}
.phase-item__name:focus { background: var(--surface); border-color: var(--brand); padding-left: var(--space-3); }
.phase-item__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-3);
}

/* warn */
.warn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--peach);
}

/* checkbox */
.check-row {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--duration-fast), background var(--duration-fast);
}
.check-row:hover { border-color: var(--brand-border); background: var(--brand-softer); }
.check {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--brand);
}
.check-row__title {
  font-weight: 500;
  font-size: var(--text-md);
  color: var(--text-primary);
}
.check-row__sub {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* segmented */
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
  transition: all var(--duration-fast);
}
.seg__btn--active {
  background: var(--surface);
  color: var(--brand-active);
  box-shadow: var(--shadow-xs);
}

/* preview */
.preview {
  background: var(--gradient-aurora);
  border-color: var(--border-subtle);
  margin-top: var(--space-5);
}
.preview__head {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: var(--space-3);
}
.preview__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface);
  border-radius: var(--radius-md);
}
.preview__icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.preview__row--mint .preview__icon { background: var(--mint-soft); }
.preview__row--lavender .preview__icon { background: var(--lavender-soft); }
.preview__row--peach .preview__icon { background: var(--peach-soft); }
.preview__name { font-size: var(--text-md); font-weight: 600; color: var(--text-primary); }
.preview__desc { font-size: var(--text-sm); color: var(--text-tertiary); margin-top: 2px; }

.create__foot {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  position: sticky;
  bottom: var(--space-3);
  background: var(--surface-overlay);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-md);
}

@media (max-width: 768px) {
  .form__row { grid-template-columns: 1fr; }
  .phase-item__row { grid-template-columns: 1fr; }
  .stepper__label { display: none; }
}
</style>
