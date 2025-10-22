// Type definitions for Cantonese Voice Chatbox Agent

export type UUID = string;

export type RetentionPolicy = 'ephemeral' | 'local-only' | 'cloud';

export interface DeviceInfo {
  ua: string;
  platform: 'iOS' | 'Android' | 'Web';
  browser: 'Safari' | 'Chrome' | 'Edge' | 'Firefox';
}

export interface AccessibilitySettings {
  ttsVoice?: string;
  ttsRate?: number; // [0.8, 1.0, 1.2]
  ttsVolume?: number; // [0.5, 0.75, 1.0]
  fontScale?: number; // [1.0, 1.25, 1.5]
  contrast?: 'normal' | 'high';
}

export interface Session {
  id: UUID;
  startedAt: string; // ISO datetime
  endedAt?: string;  // ISO datetime
  deviceInfo?: DeviceInfo;
  settings?: AccessibilitySettings;
  retention: RetentionPolicy; // default: 'ephemeral'
}

export type Role = 'user' | 'assistant';

export interface Utterance {
  id: UUID;
  sessionId: UUID;
  role: Role;
  text?: string;
  audioUrl?: string; // blob/object URL
  createdAt: string; // ISO datetime
  asrResult?: ASRResult;   // for user role
  aiResponse?: AIResponse; // for assistant role
}

export type LanguageCode = 'zh-HK' | 'yue' | 'zh';

export interface ASRSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
}

export interface ASRError {
  code: string;
  message: string;
}

export interface ASRResult {
  id: UUID;
  utteranceId: UUID;
  transcript: string;
  language: LanguageCode; // default 'zh-HK'
  confidence?: number; // 0..1
  segments?: ASRSegment[];
  isFinal: boolean;
  error?: ASRError;
}

export interface PromptConstraint {
  tone: 'friendly';
  length: 'short';
  explainLevel: 'simple';
}

export interface PromptTurn {
  role: Role;
  text: string;
}

export interface PromptContext {
  id: UUID;
  sessionId: UUID;
  lastUserText: string;
  systemDirectives: string[]; // 粵語碎片輸入提示工程規則
  conversationHistory: PromptTurn[];
  constraints: PromptConstraint;
}

export interface AIError {
  code: string;
  message: string;
}

export interface ModelInfo {
  name: string;
  version?: string;
}

export interface AIResponse {
  id: UUID;
  utteranceId: UUID;
  text: string;
  latencyMs: number; // DeepSeek round-trip time
  modelInfo?: ModelInfo;
  error?: AIError;
}

export interface PlaybackError {
  code: string;
  message: string;
}

export interface PlaybackEvent {
  id: UUID;
  utteranceId: UUID;
  ttsVoice: string;
  startedAt: string; // ISO datetime
  endedAt?: string;  // ISO datetime
  startDelayMs?: number; // delay from TTS ready to playback start
  error?: PlaybackError;
}