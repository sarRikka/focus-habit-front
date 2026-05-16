<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Smartphone } from 'lucide-vue-next';
import { useAppStore } from '../stores/app';
import { isRemote } from '../api/http';
import { normalizePhoneE164 } from '../composables/utils';

const MIN_PASSWORD_LEN = 8;

const router = useRouter();
const store = useAppStore();

const phone = ref('');
const password = ref('');
const mergeGuest = ref(true);
const submitting = ref(false);
const showPassword = ref(false);

const phoneNormalized = computed(() => normalizePhoneE164(phone.value));
const canSubmit = computed(() =>
  phoneNormalized.value.startsWith('+')
  && password.value.length >= MIN_PASSWORD_LEN
  && !submitting.value,
);

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    await store.loginWithPassword(phone.value, password.value, mergeGuest.value);
    await router.replace('/');
  } catch {
    /* toast 已在 store 中提示 */
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login">
    <button type="button" class="login__back" @click="router.back()">
      <ArrowLeft :size="18" :stroke-width="2" /> <span>返回</span>
    </button>

    <div v-if="!isRemote" class="login__card card card--padded login__mock">
      <div class="login__head">
        <div class="login__icon">
          <Smartphone :size="22" :stroke-width="2" />
        </div>
        <h1 class="login__title">登录不可用</h1>
        <p class="login__sub">
          当前为<strong>本地演示</strong>（<span class="mono">VITE_DATA_SOURCE=mock</span>）。请改为
          <span class="mono">remote</span> 并重启前端开发服务后再试。
        </p>
      </div>
      <button type="button" class="btn btn--primary btn--block" @click="router.replace('/')">
        返回首页
      </button>
    </div>

    <div v-else class="login__card card card--padded">
      <div class="login__head">
        <div class="login__icon">
          <Smartphone :size="22" :stroke-width="2" />
        </div>
        <h1 class="login__title">登录</h1>
        <p class="login__sub">使用手机号与密码登录；可与云端同步数据，游客数据可选择合并。</p>
      </div>

      <div class="form__field">
        <label class="form__label">手机号</label>
        <input
          v-model="phone"
          type="tel"
          class="input"
          inputmode="tel"
          autocomplete="username"
          placeholder="如 13800138000"
        />
        <p class="field-hint">默认使用 +86；海外号码请含国家码，如 +852…</p>
      </div>

      <div class="form__field">
        <label class="form__label">密码</label>
        <div class="password-row">
          <input
            v-model="password"
            class="input password-row__input"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="至少 8 位"
            maxlength="128"
          />
          <button type="button" class="btn btn--ghost btn--sm password-row__toggle" @click="showPassword = !showPassword">
            {{ showPassword ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <label v-if="store.profile.isGuest === true && store.profile.userId" class="merge">
        <input v-model="mergeGuest" type="checkbox" />
        <span>将当前游客数据合并到此账号</span>
      </label>

      <button type="button" class="btn btn--primary btn--block" :disabled="!canSubmit" @click="submit">
        {{ submitting ? '登录中…' : '登录' }}
      </button>

      <p class="login__footer">
        没有账号？
        <RouterLink class="link" to="/register">去注册</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: var(--space-8) var(--space-5);
  background: var(--bg-base);
  animation: fade-in var(--duration-slow) var(--ease-out);
}

.login__back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-6);
}
.login__back:hover {
  color: var(--text-primary);
}

.login__card {
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--border-subtle);
}

.login__head {
  text-align: center;
  margin-bottom: var(--space-6);
}
.login__icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-3);
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand-active);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login__title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
}
.login__sub {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
  line-height: 1.55;
}

.form__field {
  margin-bottom: var(--space-4);
}
.form__label {
  display: inline-block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.field-hint {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.password-row {
  display: flex;
  gap: var(--space-2);
  align-items: stretch;
}
.password-row__input {
  flex: 1;
  min-width: 0;
}
.password-row__toggle {
  flex-shrink: 0;
  align-self: center;
}

.merge {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-5);
  cursor: pointer;
  user-select: none;
}
.merge input {
  margin-top: 3px;
}

.btn--block {
  width: 100%;
  justify-content: center;
}

.login__footer {
  margin: var(--space-5) 0 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.login .link {
  color: var(--brand-active);
  font-weight: 500;
}
.login .link:hover {
  color: var(--brand-hover);
}

.login__mock .mono {
  font-family: ui-monospace, monospace;
  font-size: 0.92em;
}
</style>
