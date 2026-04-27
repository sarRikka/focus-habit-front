/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TARGET: string;
  readonly VITE_DATA_SOURCE: 'mock' | 'remote';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
