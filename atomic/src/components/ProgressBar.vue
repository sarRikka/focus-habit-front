<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  value: number;
  height?: number;
  color?: 'brand' | 'mint' | 'lavender' | 'peach';
  showLabel?: boolean;
}>(), {
  height: 6,
  color: 'brand',
  showLabel: false,
});

const fillStyle = computed(() => {
  const map = {
    brand: 'linear-gradient(90deg, var(--pr-brand-0) 0%, var(--pr-brand-1) 100%)',
    mint: 'linear-gradient(90deg, var(--pr-mint-0) 0%, var(--pr-mint-1) 100%)',
    lavender: 'linear-gradient(90deg, var(--pr-lavender-0) 0%, var(--pr-lavender-1) 100%)',
    peach: 'linear-gradient(90deg, var(--pr-peach-0) 0%, var(--pr-peach-1) 100%)',
  };
  return {
    background: map[props.color],
    width: `${Math.max(0, Math.min(100, props.value))}%`,
  };
});
</script>

<template>
  <div class="pb">
    <div class="pb__track" :style="{ height: `${height}px` }">
      <div class="pb__fill" :style="fillStyle"></div>
    </div>
    <div v-if="showLabel" class="pb__label num">{{ Math.round(value) }}%</div>
  </div>
</template>

<style scoped>
.pb {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}
.pb__track {
  flex: 1;
  background: var(--bg-soft);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.pb__fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-slow) var(--ease-out);
}
.pb__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}
</style>
