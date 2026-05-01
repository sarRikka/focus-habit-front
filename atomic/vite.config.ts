import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8081';
  const allowedHosts = ['haieoyutqixf.sealoshzh.site', 'ztvqhxumrnrn.sealoshzh.site'];

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: true,
      allowedHosts,
      // 把 /api 与 /uploads 转发到后端，避免浏览器同源策略限制
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          // 后端接口若已带 /api 前缀，无需 rewrite；否则在此剥离
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 3000,
      allowedHosts,
    },
  };
});
