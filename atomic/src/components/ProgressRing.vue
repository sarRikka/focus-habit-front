<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  value: number;
  size?: number;
  stroke?: number;
  color?: 'brand' | 'mint' | 'lavender' | 'peach';
  showLabel?: boolean;
  label?: string;
}>(), {
  size: 96,
  stroke: 8,
  color: 'brand',
  showLabel: true,
});

const radius = computed(() => (props.size - props.stroke) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const offset = computed(() => circumference.value * (1 - Math.min(1, Math.max(0, props.value / 100))));

const gradientId = computed(() => `pr-grad-${Math.random().toString(36).slice(2, 8)}`);

const stops = computed(() => {
  const map = {
    brand: ['var(--pr-brand-0)', 'var(--pr-brand-1)'],
    mint: ['var(--pr-mint-0)', 'var(--pr-mint-1)'],
    lavender: ['var(--pr-lavender-0)', 'var(--pr-lavender-1)'],
    peach: ['var(--pr-peach-0)', 'var(--pr-peach-1)'],
  };
  return map[props.color];
});
</script>

<template>
  <div class="ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :stop-color="stops[0]" />
          <stop offset="100%" :stop-color="stops[1]" />
        </linearGradient>
      </defs>
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="var(--border-subtle)"
        :stroke-width="stroke"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="`url(#${gradientId})`"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <div v-if="showLabel" class="ring__label">
      <slot>
        <div class="ring__value num">{{ Math.round(value) }}<span class="ring__unit">%</span></div>
        <div v-if="label" class="ring__caption">{{ label }}</div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ring__label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.ring__value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1;
}
.ring__unit {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
  margin-left: 1px;
}
.ring__caption {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.4px;
  margin-top: 4px;
}
</style>
