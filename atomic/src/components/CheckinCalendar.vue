<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { Goal } from '../types';
import { todayStr } from '../composables/utils';

const props = defineProps<{ goal: Goal }>();

const cursor = ref(new Date());

const monthLabel = computed(() => `${cursor.value.getFullYear()}年 ${cursor.value.getMonth() + 1}月`);

const cells = computed(() => {
  const year = cursor.value.getFullYear();
  const month = cursor.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = todayStr();
  const arr: { date: string; day: number; status: string; isToday: boolean; isOther?: boolean }[] = [];

  for (let i = 0; i < startWeekday; i++) {
    arr.push({ date: '', day: 0, status: '', isToday: false, isOther: true });
  }
  for (let d = 1; d <= days; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const c = props.goal.checkins[ds];
    let status: string = '';
    if (c) status = c.status;
    if (!status && ds < today && ds >= props.goal.createdAt) status = 'missed-soft';
    arr.push({ date: ds, day: d, status, isToday: ds === today });
  }
  while (arr.length % 7 !== 0) arr.push({ date: '', day: 0, status: '', isToday: false, isOther: true });
  return arr;
});

function prev() {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() - 1, 1);
}
function next() {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 1);
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
</script>

<template>
  <div class="cal">
    <div class="cal__head">
      <button class="cal__nav" @click="prev"><ChevronLeft :size="16" /></button>
      <div class="cal__title">{{ monthLabel }}</div>
      <button class="cal__nav" @click="next"><ChevronRight :size="16" /></button>
    </div>
    <div class="cal__weekdays">
      <div v-for="w in weekdays" :key="w">{{ w }}</div>
    </div>
    <div class="cal__grid">
      <div
        v-for="(c, i) in cells"
        :key="i"
        class="cal__cell"
        :class="{
          'cal__cell--other': c.isOther,
          'cal__cell--today': c.isToday,
          [`cal__cell--${c.status}`]: c.status,
        }"
      >
        <span v-if="c.day > 0" class="num">{{ c.day }}</span>
      </div>
    </div>
    <div class="cal__legend">
      <div><span class="dot dot--done"></span>已打卡</div>
      <div><span class="dot dot--late"></span>延迟</div>
      <div><span class="dot dot--missed"></span>未打卡</div>
      <div><span class="dot dot--paused"></span>暂停</div>
    </div>
  </div>
</template>

<style scoped>
.cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.cal__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.4px;
}
.cal__nav {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  transition: background var(--duration-fast);
}
.cal__nav:hover { background: var(--bg-soft); color: var(--text-primary); }

.cal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}
.cal__weekdays > div {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: 500;
  padding: 4px 0;
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cal__cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  position: relative;
}
.cal__cell--other { background: transparent; }

.cal__cell--done {
  background: var(--mint-soft);
  color: #4DA88B;
}
.cal__cell--late {
  background: var(--peach-soft);
  color: #C68A52;
}
.cal__cell--missed {
  background: var(--coral-soft);
  color: #C76C6B;
}
.cal__cell--missed-soft {
  background: var(--bg-soft);
  color: var(--text-tertiary);
  opacity: 0.6;
}
.cal__cell--paused {
  background: var(--lavender-soft);
  color: #7665B8;
}
.cal__cell--today {
  box-shadow: 0 0 0 2px var(--brand);
  color: var(--brand-active);
}

.cal__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
.cal__legend > div {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}
.dot--done { background: #92D6BF; }
.dot--late { background: #F0B98A; }
.dot--missed { background: #E8908F; }
.dot--paused { background: #B6ABE2; }
</style>
