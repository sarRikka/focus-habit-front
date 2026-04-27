<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  open: boolean;
  title?: string;
  desc?: string;
  width?: number;
}>();

const emit = defineEmits<{ close: [] }>();

function close() { emit('close'); }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close();
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));

watch(() => props.open, (v) => {
  document.body.style.overflow = v ? 'hidden' : '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-mask" @click.self="close">
        <div class="modal" :style="{ maxWidth: `${width ?? 480}px` }">
          <div class="modal__head">
            <div>
              <div class="modal__title">{{ title }}</div>
              <div v-if="desc" class="modal__desc">{{ desc }}</div>
            </div>
            <button class="modal__close" @click="close">
              <X :size="18" :stroke-width="2" />
            </button>
          </div>
          <div class="modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal__foot">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 60, 0.36);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}
.modal {
  width: 100%;
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6) var(--space-3);
  gap: var(--space-3);
}
.modal__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}
.modal__desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-top: 4px;
}
.modal__close {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}
.modal__close:hover {
  background: var(--bg-soft);
  color: var(--text-primary);
}
.modal__body {
  padding: var(--space-3) var(--space-6) var(--space-6);
  overflow-y: auto;
}
.modal__foot {
  padding: var(--space-4) var(--space-6) var(--space-5);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}
.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
</style>
