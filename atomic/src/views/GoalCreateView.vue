<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ChevronLeft, ChevronRight, Check, Lightbulb,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { addDays, categoryPresets, goalIcons, todayStr, uid, weeklyCheckinDayChoices, formatMinutes } from '../composables/utils';
import {
  buildGoalFromCreateForm,
  completionDaysRoundedFromForm,
  perDayMinutesFromForm,
  plannedTotalMinutesFromForm,
  validateGoalCreateStep,
  type GoalCreateFormInput,
} from '../composables/goalCreateFlow';
const router = useRouter();
const store = useAppStore();

const step = ref(1);
const totalSteps = 3;

interface FormState extends GoalCreateFormInput {}

const form = reactive<FormState>({
  category: 'habit',
  customCategoryName: '',
  name: '',
  finalGoal: '',
  coreNeed: '',
  deadline: addDays(todayStr(), 60),
  totalDescription: '',
  completionDays: 60,
  dailyHours: 0,
  dailyMinutes: 30,
  dailyDescription: '',
  daysPerWeek: 7,
  icon: '🎯',
  color: 'brand',
});

const colorOptions: { key: FormState['color']; name: string }[] = [
  { key: 'brand', name: '青蓝' },
  { key: 'mint', name: '薄荷' },
  { key: 'lavender', name: '柔紫' },
  { key: 'peach', name: '蜜桃' },
];

/** 每天在计划中的投入（分钟），用于阶段总时长与打卡目标 */
const perDayMinutes = computed(() => perDayMinutesFromForm(form));

const completionDaysRounded = computed(() => completionDaysRoundedFromForm(form));

/** 计划在第二步中的总投入（分钟）*/
const plannedTotalMinutes = computed(() => plannedTotalMinutesFromForm(form));

/** 计划总时长折合小时（用于第二步展示）；整数不写小数，否则一位小数 */
const plannedTotalHoursText = computed(() => {
  const m = plannedTotalMinutes.value;
  const h = m / 60;
  if (!Number.isFinite(h) || h <= 0) return '0';
  const rounded = Math.round(h * 10) / 10;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
});

/** 第三步：默认展示第二步的时长，点此展开微调 */
const showDailyTargetEdit = ref(false);
watch(step, (s) => {
  if (s === 3) showDailyTargetEdit.value = false;
});

const stepValid = computed(() => validateGoalCreateStep(step.value as 1 | 2 | 3, form, todayStr()));

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
  const goal = buildGoalFromCreateForm(form, { goalId: uid('g') });
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
            {{ ['基础信息', '计划周期', '每日习惯'][i - 1] }}
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
          <label class="form__label">核心诉求</label>
          <details class="details-opt">
            <summary class="details-opt__summary">
              <span class="details-opt__title">可选填写</span>
              <span class="details-opt__chev" aria-hidden="true">▾</span>
              <span class="details-opt__hint-inline">点开展开，说明「真正想解决什么」；不填也能继续</span>
            </summary>
            <p class="field-help details-opt__lead">
              用一两句话写清动机或深层需要（例如健康、自信、关系），习惯稳定后也可用来对照「有没有跑偏」。创建时跳过无妨，之后可在目标详情里补写。
            </p>
            <textarea
              v-model="form.coreNeed"
              class="textarea details-opt__body"
              rows="3"
              placeholder="例：不是单纯减肥，而是希望作息规律、白天更有精神"
            ></textarea>
          </details>
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

      <!-- Step 2：计划天数与每日投入 -->
      <section v-if="step === 2" class="card card--padded-lg form">
        <h2 class="form__title">计划用多久、每天做多少</h2>
        <p class="form__sub">"把总任务拆成可预期的天数与每日投入，进度更清晰"</p>

        <div class="hint card card--padded-sm">
          <Lightbulb :size="16" :stroke-width="2" />
          <div>
            <strong>怎么填</strong>
            <span>「完成天数」是你预期坚持投入的天数；「每天」可填例如 1 小时 + 30 分钟。系统会用「天数 × 每天时长」汇总为进度条的总目标时长（与截止日期独立，你可自行对齐节奏）。</span>
          </div>
        </div>

        <div class="form__field">
          <label class="form__label">完成需要多少天 <span class="req">*</span></label>
          <input
            v-model.number="form.completionDays"
            type="number"
            min="1"
            step="1"
            class="input input--narrow"
          />
          <p class="field-help">正整数，表示你希望分配在这个目标上的日历天数维度（计划跨度）。</p>
        </div>

        <div class="form__field">
          <label class="form__label">每天投入 <span class="req">*</span></label>
          <div class="form__dh">
            <input
              v-model.number="form.dailyHours"
              type="number"
              min="0"
              step="1"
              class="input input--narrow"
            />
            <span class="form__suffix">小时</span>
            <input
              v-model.number="form.dailyMinutes"
              type="number"
              min="0"
              step="1"
              class="input input--narrow"
            />
            <span class="form__suffix">分钟</span>
          </div>
          <p v-if="perDayMinutes < 1" class="field-help field-help--warn">每日至少投入 1 分钟（可把分钟调为 ≥1）。</p>
          <p v-else class="field-help">
            约 <strong>{{ formatMinutes(perDayMinutes) }}</strong> / 天；计划总计约 <strong>{{ formatMinutes(plannedTotalMinutes) }}</strong>
            ，折合 <strong>{{ plannedTotalHoursText }} 小时</strong>
            （{{ completionDaysRounded }} 天 × 每日投入）。
          </p>
        </div>

        <div class="form__field">
          <label class="form__label">总事项描述</label>
          <textarea
            v-model="form.totalDescription"
            class="textarea"
            rows="2"
            placeholder="一句话描述这个目标整体要做什么（可选，将写入阶段说明）"
          ></textarea>
        </div>
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
            placeholder="例：晚上 7 点学习 30 分钟，完成 1 道练习题"
          ></textarea>
        </div>

        <div class="form__field">
          <label class="form__label">每日计时目标</label>
          <p class="field-help daily-target-intro">
            默认与第二步「每天投入」一致。打卡页按此时长倒计时；若要单独缩短或拉长单次打卡目标，点击下方区域修改。
          </p>
          <button
            type="button"
            class="daily-target-summary"
            :aria-expanded="showDailyTargetEdit"
            aria-label="更改每日计时目标"
            @click="showDailyTargetEdit = !showDailyTargetEdit"
          >
            <div class="daily-target-summary__text">
              <span class="daily-target-summary__value">{{ formatMinutes(perDayMinutes) }}</span>
              <span class="daily-target-summary__unit"> / 天</span>
              <span v-if="!showDailyTargetEdit" class="daily-target-summary__tap-hint">轻触更改</span>
            </div>
            <span class="daily-target-summary__action">{{ showDailyTargetEdit ? '收起' : '更改' }}</span>
          </button>
          <div v-show="showDailyTargetEdit" class="daily-target-edit">
            <div class="form__dh">
              <input
                v-model.number="form.dailyHours"
                type="number"
                min="0"
                step="1"
                class="input input--narrow"
              />
              <span class="form__suffix">小时</span>
              <input
                v-model.number="form.dailyMinutes"
                type="number"
                min="0"
                step="1"
                class="input input--narrow"
              />
              <span class="form__suffix">分钟</span>
            </div>
            <p v-if="perDayMinutes < 1" class="field-help field-help--warn">合计至少 1 分钟。</p>
          </div>
        </div>

        <div class="form__field">
          <label class="form__label">每周打卡天数</label>
          <div class="weekly-days" role="radiogroup" aria-label="每周计划打卡天数">
            <button
              v-for="opt in weeklyCheckinDayChoices"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="form.daysPerWeek === opt.value"
              class="weekly-days__btn"
              :class="{ 'weekly-days__btn--active': form.daysPerWeek === opt.value }"
              @click="form.daysPerWeek = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="field-help">按周计划执行的天数；选「每天」即一周 7 天都打算打卡。</p>
        </div>

        <!-- 预览 -->
        <div class="preview card--padded card">
          <div class="preview__head">预览</div>
          <div class="preview__row" :class="`preview__row--${form.color}`">
            <div class="preview__icon">{{ form.icon }}</div>
            <div>
              <div class="preview__name">{{ form.name || '目标名称' }}</div>
              <div class="preview__desc">
                {{ form.dailyDescription || '每日事项' }} · {{ formatMinutes(perDayMinutes) }} / 天
                <template v-if="form.daysPerWeek < 7"> · 每周 {{ form.daysPerWeek }} 天</template>
              </div>
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
  color: var(--text-on-color);
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

/* optional core need */
.details-opt {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  background: var(--bg-soft);
}
.details-opt__summary {
  cursor: pointer;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
  list-style: none;
}
.details-opt__summary::-webkit-details-marker { display: none; }
.details-opt__title {
  color: var(--text-primary);
  font-weight: 600;
}
.details-opt__chev {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform var(--duration-fast) var(--ease-out);
}
.details-opt[open] .details-opt__chev { transform: rotate(-180deg); }
.details-opt__hint-inline {
  flex: 1 1 100%;
  font-weight: 400;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  line-height: 1.5;
}
.details-opt__lead {
  margin-top: var(--space-3);
  margin-bottom: 0;
}
.details-opt__body { margin-top: var(--space-3); }

.field-help {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
.field-help--warn { color: var(--coral); }
.form__inline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.input--narrow { max-width: 140px; }
.form__suffix { font-size: var(--text-sm); color: var(--text-secondary); }
.form__dh {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.daily-target-intro {
  margin-bottom: var(--space-3);
}
.daily-target-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-4);
  margin: 0;
  margin-bottom: var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-soft);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition:
    border-color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}
.daily-target-summary:hover {
  border-color: var(--brand-border);
  background: var(--brand-softer);
}
.daily-target-summary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.daily-target-summary__text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
}
.daily-target-summary__value {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}
.daily-target-summary__unit {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.daily-target-summary__tap-hint {
  flex: 1 1 100%;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
.daily-target-summary__action {
  flex-shrink: 0;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--brand-active);
}
.daily-target-edit {
  padding: var(--space-4);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
  background: var(--surface);
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
  .stepper__label { display: none; }
}
</style>
