<script setup lang="ts">
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-vue-next';
import { useAppStore } from '../stores/app';

const store = useAppStore();

const iconMap = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};
</script>

<template>
  <div class="toasts">
    <TransitionGroup name="toast">
      <div
        v-for="t in store.toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
      >
        <div class="toast__icon">
          <component :is="iconMap[t.type]" :size="18" :stroke-width="2.2" />
        </div>
        <div class="toast__body">
          <div class="toast__title">{{ t.title }}</div>
          <div v-if="t.desc" class="toast__desc">{{ t.desc }}</div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  pointer-events: none;
}
.toast {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 280px;
  max-width: 360px;
  pointer-events: auto;
  align-items: flex-start;
}
.toast__icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.toast--success .toast__icon { background: var(--success-soft); color: var(--success); }
.toast--info .toast__icon { background: var(--info-soft); color: var(--info); }
.toast--warning .toast__icon { background: var(--warning-soft); color: var(--warning); }
.toast--danger .toast__icon { background: var(--danger-soft); color: var(--danger); }

.toast__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}
.toast__desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1.5;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }

@media (max-width: 768px) {
  .toasts {
    top: var(--space-4);
    right: var(--space-4);
    left: var(--space-4);
  }
  .toast {
    min-width: 0;
    max-width: none;
  }
}
</style>
