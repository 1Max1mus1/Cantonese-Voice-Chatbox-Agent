/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_SPEECH_KEY?: string;
  readonly VITE_AZURE_SPEECH_REGION?: string;
  readonly VITE_DEEPSEEK_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}