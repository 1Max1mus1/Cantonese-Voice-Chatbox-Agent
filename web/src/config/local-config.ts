import type { AccessibilitySettings } from '../types/session';

export type AzureConfig = {
  key?: string;
  region: string; // e.g. 'eastasia'
};

export type DeepSeekConfig = {
  apiKey?: string;
};

export type AppConfig = {
  azure: AzureConfig;
  tts: Required<Pick<AccessibilitySettings, 'ttsVoice' | 'ttsRate' | 'ttsVolume'>>;
  deepseek: DeepSeekConfig;
};

const STORAGE_KEY = 'cvc.local.config.v1';

const DEFAULT_CONFIG: AppConfig = {
  azure: {
    key: undefined,
    region: 'eastasia',
  },
  tts: {
    ttsVoice: 'zh-HK-HiuMaanNeural', // Cantonese female default
    ttsRate: 1.0,
    ttsVolume: 0.75,
  },
  deepseek: {
    apiKey: undefined,
  },
};

const isValidRate = (rate: number) => [0.8, 1.0, 1.2].includes(rate);
const isValidVolume = (vol: number) => [0.5, 0.75, 1.0].includes(vol);

function mergeConfig(base: AppConfig, incoming: Partial<AppConfig>): AppConfig {
  const result: AppConfig = {
    azure: {
      region: incoming.azure?.region ?? base.azure.region,
      key: incoming.azure?.key ?? base.azure.key,
    },
    tts: {
      ttsVoice: incoming.tts?.ttsVoice ?? base.tts.ttsVoice,
      ttsRate: incoming.tts?.ttsRate ?? base.tts.ttsRate,
      ttsVolume: incoming.tts?.ttsVolume ?? base.tts.ttsVolume,
    },
    deepseek: {
      apiKey: incoming.deepseek?.apiKey ?? base.deepseek.apiKey,
    },
  };

  // clamp/validate
  if (!isValidRate(result.tts.ttsRate)) result.tts.ttsRate = DEFAULT_CONFIG.tts.ttsRate;
  if (!isValidVolume(result.tts.ttsVolume)) result.tts.ttsVolume = DEFAULT_CONFIG.tts.ttsVolume;

  return result;
}

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch (e) {
    console.warn('Failed to load config, using defaults', e);
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(update: Partial<AppConfig>): AppConfig {
  const current = loadConfig();
  const merged = mergeConfig(current, update);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function resetConfig(): AppConfig {
  localStorage.removeItem(STORAGE_KEY);
  return loadConfig();
}

// Convenience getters/setters
export function getAzureKey(): string | undefined {
  const fromEnv = (import.meta as any)?.env?.VITE_AZURE_SPEECH_KEY as string | undefined;
  return (fromEnv && fromEnv.trim()) ? fromEnv.trim() : loadConfig().azure.key;
}

export function setAzureKey(key?: string): AppConfig {
  // Include current region to satisfy AzureConfig type requirements
  return saveConfig({ azure: { key, region: getAzureRegion() } });
}

export function getAzureRegion(): string {
  const fromEnv = (import.meta as any)?.env?.VITE_AZURE_SPEECH_REGION as string | undefined;
  return (fromEnv && fromEnv.trim()) ? fromEnv.trim() : loadConfig().azure.region;
}

export function setAzureRegion(region: string): AppConfig {
  return saveConfig({ azure: { region } });
}

export function getDeepSeekApiKey(): string | undefined {
  const fromEnv = (import.meta as any)?.env?.VITE_DEEPSEEK_API_KEY as string | undefined;
  return (fromEnv && fromEnv.trim()) ? fromEnv.trim() : loadConfig().deepseek.apiKey;
}

export function setDeepSeekApiKey(apiKey?: string): AppConfig {
  return saveConfig({ deepseek: { apiKey } });
}

export function getTtsSettings(): AccessibilitySettings {
  return loadConfig().tts;
}

export function setTtsSettings(settings: Partial<AccessibilitySettings>): AppConfig {
  const current = loadConfig().tts;
  const incoming: Partial<AppConfig> = {
    tts: {
      ttsVoice: settings.ttsVoice ?? current.ttsVoice,
      ttsRate: settings.ttsRate ?? current.ttsRate,
      ttsVolume: settings.ttsVolume ?? current.ttsVolume,
    },
  };
  return saveConfig(incoming);
}