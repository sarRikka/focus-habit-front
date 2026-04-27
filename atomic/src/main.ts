import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAppStore } from './stores/app';
import { isRemote } from './api/http';
import './styles/global.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

if (isRemote) {
  const store = useAppStore(pinia);
  void store.bootstrapFromRemote();
}

app.mount('#app');
