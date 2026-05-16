<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ChevronLeft, Moon, Sun, Sparkles, Trash2, Plus,
  RefreshCw, Plane, Briefcase, Heart, Calendar as CalendarIcon,
  Shield, Database,
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { todayStr, addDays, formatDate } from '../composables/utils';
import Modal from '../components/Modal.vue';
import type { SpecialMode } from '../types';

const router = useRouter();
const store = useAppStore();

const newPhrase = ref('');
function addPhrase() {
  const v = newPhrase.value.trim();
  if (!v) return;
  store.updateSettings({ customEncouragements: [v, ...store.settings.customEncouragements] });
  newPhrase.value = '';
}
function removePhrase(i: number) {
  const arr = [...store.settings.customEncouragements];
  arr.splice(i, 1);
  store.updateSettings({ customEncouragements: arr });
}

const themeOptions = [
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'dark', label: '深色', icon: Moon },
] as const;

/* 特殊场景 */
const showAddScene = ref(false);
const sceneForm = reactive({
  type: 'holiday' as 'holiday' | 'travel' | 'sick' | 'other',
  label: '',
  startDate: todayStr(),
  endDate: addDays(todayStr(), 1),
  mode: 'shorten' as SpecialMode,
  shortenTo: 3,
  extendHours: 2,
});

function submitScene() {
  if (sceneForm.endDate < sceneForm.startDate) {
    store.showToast({ type: 'warning', title: '日期范围有误', desc: '截止日期需晚于起始日期' });
    return;
  }
  // R03: 暂停模式累计不超过 3 天
  if (sceneForm.mode === 'pause') {
    const days = (new Date(sceneForm.endDate).getTime() - new Date(sceneForm.startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
    if (days > 3) {
      store.showToast({ type: 'warning', title: '暂停最多 3 天', desc: '请缩短时间范围或改为「缩短时长」模式' });
      return;
    }
  }
  store.addScene({
    type: sceneForm.type,
    label: sceneForm.label || sceneTypeLabel(sceneForm.type),
    startDate: sceneForm.startDate,
    endDate: sceneForm.endDate,
    mode: sceneForm.mode,
    shortenTo: sceneForm.mode === 'shorten' ? sceneForm.shortenTo : undefined,
    extendHours: sceneForm.mode === 'extend' ? sceneForm.extendHours : undefined,
  });
  showAddScene.value = false;
  sceneForm.label = '';
}

function sceneTypeLabel(t: string) {
  return ({ holiday: '节假日', travel: '出差', sick: '生病', other: '其他' } as Record<string, string>)[t] ?? '其他';
}
function sceneTypeIcon(t: string) {
  return ({ holiday: CalendarIcon, travel: Plane, sick: Heart, other: Briefcase } as Record<string, any>)[t];
}
function modeLabel(m: SpecialMode) {
  return ({ shorten: '缩短时长', extend: '延长延迟', pause: '暂停打卡' } as Record<SpecialMode, string>)[m];
}

const showReset = ref(false);
function reset() {
  store.resetAll();
  showReset.value = false;
}

const retentionOptions = [
  { key: '1y', label: '1 年' },
  { key: '3y', label: '3 年' },
  { key: '5y', label: '5 年' },
  { key: 'forever', label: '永久' },
] as const;

</script>

<template>
  <div class="settings">
    <button class="back" @click="router.back()">
      <ChevronLeft :size="18" :stroke-width="2" /> <span>返回</span>
    </button>

    <!-- 特殊场景 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3><CalendarIcon :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 特殊场景</h3>
          <span class="section-title__sub">提前设置节假日、出差、生病等场景</span>
        </div>
        <button class="btn btn--secondary btn--sm" @click="showAddScene = true">
          <Plus :size="14" :stroke-width="2.2" /> 添加场景
        </button>
      </div>

      <div v-if="store.scenes.length === 0" class="empty empty--inline">
        <CalendarIcon :size="18" />
        <span>暂无特殊场景，可在出差或假期前提前设置</span>
      </div>

      <div v-else class="scene-list">
        <div v-for="s in store.scenes" :key="s.id" class="scene-item">
          <div class="scene-item__icon">
            <component :is="sceneTypeIcon(s.type)" :size="16" :stroke-width="2" />
          </div>
          <div class="scene-item__main">
            <div class="scene-item__name">{{ s.label }}</div>
            <div class="scene-item__sub">{{ formatDate(s.startDate, 'CN') }} → {{ formatDate(s.endDate, 'CN') }} · {{ modeLabel(s.mode) }}</div>
          </div>
          <span v-if="store.isSceneActive(s)" class="tag tag--mint">生效中</span>
          <button class="btn btn--ghost btn--icon btn--sm" @click="store.deleteScene(s.id)">
            <Trash2 :size="13" :stroke-width="2" />
          </button>
        </div>
      </div>
    </section>

    <!-- 个性化鼓励语 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3><Sparkles :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 个性化鼓励语</h3>
          <span class="section-title__sub">打卡成功等场景随机展示时优先采用</span>
        </div>
      </div>
      <div class="phrase-add">
        <input v-model="newPhrase" class="input" placeholder="例如：今天，做一个让明天感谢的人" @keyup.enter="addPhrase" />
        <button class="btn btn--primary" @click="addPhrase">添加</button>
      </div>
      <div v-if="store.settings.customEncouragements.length === 0" class="empty empty--inline">
        <span>还没有自定义鼓励语，添加一句你最喜欢的句子吧</span>
      </div>
      <div v-else class="phrase-list">
        <div v-for="(p, i) in store.settings.customEncouragements" :key="i" class="phrase-item">
          <span>「{{ p }}」</span>
          <button class="btn btn--ghost btn--icon btn--sm" @click="removePhrase(i)">
            <Trash2 :size="13" :stroke-width="2" />
          </button>
        </div>
      </div>
    </section>

    <!-- 主题 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3><Sun :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 主题</h3>
        </div>
      </div>
      <div class="theme-row">
        <button
          v-for="o in themeOptions"
          :key="o.key"
          class="theme-card"
          :class="{ 'theme-card--active': store.settings.theme === o.key }"
          @click="store.updateSettings({ theme: o.key })"
        >
          <component :is="o.icon" :size="16" :stroke-width="2" />
          <span>{{ o.label }}</span>
        </button>
      </div>
    </section>

    <!-- 数据 -->
    <section class="card card--padded">
      <div class="section-title">
        <div class="section-title__main">
          <h3><Database :size="14" :stroke-width="2" style="vertical-align:-2px;margin-right:4px" /> 数据管理</h3>
          <span class="section-title__sub">所有数据均本地存储，不会上传任何服务器</span>
        </div>
      </div>
      <div class="row">
        <label class="row__label">数据留存时长</label>
        <div class="seg">
          <button v-for="o in retentionOptions" :key="o.key" class="seg__btn" :class="{'seg__btn--active': store.settings.dataRetention === o.key}" @click="store.updateSettings({ dataRetention: o.key })">
            {{ o.label }}
          </button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="row">
        <div>
          <div style="font-weight:500;color:var(--text-primary)">重置示例数据</div>
          <div style="font-size:var(--text-sm); color:var(--text-tertiary); margin-top:4px">
            重新加载初始示例目标与复盘记录
          </div>
        </div>
        <button class="btn btn--outline" @click="showReset = true">
          <RefreshCw :size="14" :stroke-width="2" /> 重置
        </button>
      </div>
    </section>

    <!-- 关于 -->
    <section class="card card--padded about">
      <Shield :size="14" :stroke-width="2" />
      <div>
        <div style="font-weight:500;color:var(--text-primary)">Atomic · 基于《原子习惯》</div>
        <div style="font-size:var(--text-sm); color:var(--text-tertiary); margin-top:2px">
          数据本地加密存储 · 离线可用 · 联网自动同步
        </div>
      </div>
    </section>

    <!-- 添加场景 -->
    <Modal :open="showAddScene" title="添加特殊场景" desc="提前设置，APP 自动适配打卡规则" :width="520" @close="showAddScene = false">
      <div class="form__field">
        <label class="form__label">场景类型</label>
        <div class="seg">
          <button v-for="t in ['holiday','travel','sick','other']" :key="t" class="seg__btn" :class="{ 'seg__btn--active': sceneForm.type === t }" @click="sceneForm.type = t as any">
            {{ sceneTypeLabel(t) }}
          </button>
        </div>
      </div>
      <div class="form__field">
        <label class="form__label">场景名称（可选）</label>
        <input v-model="sceneForm.label" class="input" placeholder="例如：清明假期" />
      </div>
      <div class="form-row">
        <div class="form__field">
          <label class="form__label">起始日期</label>
          <input v-model="sceneForm.startDate" type="date" class="input" />
        </div>
        <div class="form__field">
          <label class="form__label">截止日期</label>
          <input v-model="sceneForm.endDate" type="date" class="input" />
        </div>
      </div>
      <div class="form__field">
        <label class="form__label">适配模式</label>
        <div class="seg">
          <button class="seg__btn" :class="{ 'seg__btn--active': sceneForm.mode === 'shorten' }" @click="sceneForm.mode = 'shorten'">缩短时长</button>
          <button class="seg__btn" :class="{ 'seg__btn--active': sceneForm.mode === 'extend' }" @click="sceneForm.mode = 'extend'">延长延迟</button>
          <button class="seg__btn" :class="{ 'seg__btn--active': sceneForm.mode === 'pause' }" @click="sceneForm.mode = 'pause'">暂停打卡</button>
        </div>
      </div>
      <div v-if="sceneForm.mode === 'shorten'" class="form__field">
        <label class="form__label">缩短到（分钟，最低 1）</label>
        <input v-model.number="sceneForm.shortenTo" type="number" min="1" class="input" />
      </div>
      <div v-if="sceneForm.mode === 'extend'" class="form__field">
        <label class="form__label">延迟打卡时间（小时，最长 3）</label>
        <input v-model.number="sceneForm.extendHours" type="number" min="1" max="3" class="input" />
      </div>
      <p v-if="sceneForm.mode === 'pause'" class="text-tertiary" style="font-size:var(--text-sm)">
        暂停期间不计入断签、不扣除进度。一个场景内累计不超过 3 天。
      </p>
      <template #footer>
        <button class="btn btn--ghost" @click="showAddScene = false">取消</button>
        <button class="btn btn--primary" @click="submitScene">保存场景</button>
      </template>
    </Modal>

    <Modal :open="showReset" title="确认重置数据？" desc="将清除当前所有目标、打卡和复盘记录，重新加载示例数据" @close="showReset = false">
      <p class="text-secondary">此操作不可撤销。</p>
      <template #footer>
        <button class="btn btn--ghost" @click="showReset = false">取消</button>
        <button class="btn btn--danger" @click="reset">确认重置</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 760px;
  margin: 0 auto;
  animation: fade-in var(--duration-slow) var(--ease-out);
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

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}
.row + .row { border-top: 1px dashed var(--border-subtle); }
.row__label {
  font-size: var(--text-md);
  color: var(--text-secondary);
  font-weight: 500;
}
.row__input { width: 140px; }
.row--stack {
  flex-direction: column;
  align-items: stretch;
}
.row--stack .row__label { margin-bottom: var(--space-2); }
.row__hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  line-height: 1.5;
}

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
.seg--wrap {
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

/* switch */
.switch {
  width: 40px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--border);
  padding: 2px;
  position: relative;
  transition: background var(--duration-base);
}
.switch__dot {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  transform: translateX(0);
  transition: transform var(--duration-base) var(--ease-out);
}
.switch--on { background: var(--brand); }
.switch--on .switch__dot { transform: translateX(18px); }

/* scenes */
.scene-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.scene-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-soft);
  border-radius: var(--radius-md);
}
.scene-item__icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
}
.scene-item__main { flex: 1; min-width: 0; }
.scene-item__name { font-size: var(--text-md); font-weight: 500; color: var(--text-primary); }
.scene-item__sub { font-size: var(--text-xs); color: var(--text-tertiary); margin-top: 2px; }

.empty--inline {
  flex-direction: row;
  padding: var(--space-4);
  font-size: var(--text-sm);
  background: var(--bg-soft);
  border-radius: var(--radius-md);
  gap: var(--space-2);
}

/* phrases */
.phrase-add {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.phrase-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.phrase-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.phrase-item span { flex: 1; }

/* theme */
.theme-row { display: flex; gap: var(--space-3); }
.theme-card {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-soft);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-secondary);
  transition: all var(--duration-fast);
}
.theme-card:hover { background: var(--brand-softer); }
.theme-card--active {
  background: var(--brand-softer);
  border-color: var(--brand);
  color: var(--brand-active);
}

.about {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--bg-soft);
  border-color: transparent;
  color: var(--brand);
}

/* form helpers */
.form__field { margin-bottom: var(--space-4); }
.form__label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }

@media (max-width: 768px) {
  .row { flex-direction: column; align-items: flex-start; }
  .row__input { width: 100%; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
