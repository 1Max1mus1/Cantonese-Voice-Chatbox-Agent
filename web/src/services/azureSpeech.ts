import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { getAzureKey, getAzureRegion, getTtsSettings } from '../config/local-config';

export type RecognizingEvent = { text: string };
export type RecognizedEvent = { text: string; confidence?: number };
export type ErrorEvent = { code: string; message: string };

export type RecognizerCallbacks = {
  onSessionStarted?: () => void;
  onRecognizing?: (e: RecognizingEvent) => void;
  onRecognized?: (e: RecognizedEvent) => void;
  onSessionStopped?: () => void;
  onCanceled?: (e: ErrorEvent) => void;
};

export type RecognizerController = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  dispose: () => void;
};

function ensureAzureCreds(): { key: string; region: string } {
  const key = getAzureKey();
  const region = getAzureRegion();
  if (!key || !region) {
    throw new Error('Azure Speech credentials missing. Set Key and Region in Settings.');
  }
  return { key, region };
}

function buildSpeechConfig(): sdk.SpeechConfig {
  const { key, region } = ensureAzureCreds();
  const cfg = sdk.SpeechConfig.fromSubscription(key, region);
  // Recognition defaults for Cantonese
  cfg.speechRecognitionLanguage = 'zh-HK';
  // Synthesis defaults
  const tts = getTtsSettings();
  cfg.speechSynthesisVoiceName = tts.ttsVoice ?? 'zh-HK-HiuMaanNeural';
  // 使用更廣泛支援的 MP3 取樣率與位元率，避免某些裝置無法解碼 48kHz/192kbps
  cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
  return cfg;
}

function mapRate(rate: number): string {
  // Convert numeric rate to SSML prosody percentage
  if (rate === 0.8) return '-20%';
  if (rate === 1.2) return '+20%';
  return '0%'; // 1.0
}

function mapVolume(vol: number): string {
  // Map numeric volume to SSML categories
  if (vol === 0.5) return 'soft';
  if (vol === 1.0) return 'loud';
  return 'medium'; // 0.75
}

// Removed duplicate preprocessForSpeech (kept the comprehensive version below)

export type SynthesisOptions = {
  text: string;
  voiceName?: string;
  rate?: number; // 0.8 | 1.0 | 1.2
  volume?: number; // 0.5 | 0.75 | 1.0
};

export type SynthesisResult = {
  audioUrl: string;
  audioData: Uint8Array;
};

export async function synthesizeToMp3(opts: SynthesisOptions): Promise<SynthesisResult> {
  const speechConfig = buildSpeechConfig();
  if (opts.voiceName) speechConfig.speechSynthesisVoiceName = opts.voiceName;

  const rate = mapRate(opts.rate ?? getTtsSettings().ttsRate);
  const volume = mapVolume(opts.volume ?? getTtsSettings().ttsVolume);

  const prepared = preprocessForSpeech(opts.text);

  const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xml:lang="zh-HK">
  <voice name="${speechConfig.speechSynthesisVoiceName}">
    <prosody rate="${rate}" volume="${volume}">${escapeXml(prepared)}</prosody>
  </voice>
</speak>`;

  // IMPORTANT: Route synthesis to a pull stream to prevent automatic speaker playback.
  const pullStream = sdk.AudioOutputStream.createPullStream();
  const audioConfig = sdk.AudioConfig.fromAudioOutputStream(pullStream);
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  const result = await new Promise<sdk.SpeechSynthesisResult>((resolve, reject) => {
    synthesizer.speakSsmlAsync(
      ssml,
      (res) => {
        synthesizer.close();
        resolve(res);
      },
      (err) => {
        synthesizer.close();
        reject(err);
      }
    );
  });

  if ((result as any).reason !== (sdk as any).ResultReason.SynthesizingAudioCompleted) {
    throw new Error(`Synthesis failed: ${(result as any).errorDetails ?? (result as any).reason}`);
  }

  const raw = (result as any).audioData as ArrayBuffer | Uint8Array;
  const audioData = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  if (!audioData?.length) {
    console.warn('Azure TTS returned empty audioData');
  }
  const blob = new Blob([audioData], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(blob);

  return { audioUrl, audioData };
}

export async function speakToSpeaker(opts: SynthesisOptions): Promise<void> {
  const speechConfig = buildSpeechConfig();
  if (opts.voiceName) speechConfig.speechSynthesisVoiceName = opts.voiceName;

  const rate = mapRate(opts.rate ?? getTtsSettings().ttsRate);
  const volume = mapVolume(opts.volume ?? getTtsSettings().ttsVolume);
  const prepared = preprocessForSpeech(opts.text);

  const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xml:lang="zh-HK">
  <voice name="${speechConfig.speechSynthesisVoiceName}">
    <prosody rate="${rate}" volume="${volume}">${escapeXml(prepared)}</prosody>
  </voice>
</speak>`;

  const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  await new Promise<void>((resolve, reject) => {
    synthesizer.speakSsmlAsync(
      ssml,
      (res) => {
        synthesizer.close();
        if (res.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve();
        } else {
          reject(new Error(`Synthesis failed: ${res.errorDetails ?? res.reason}`));
        }
      },
      (err) => {
        synthesizer.close();
        reject(err);
      }
    );
  });
}

export function createRecognizer(callbacks: RecognizerCallbacks = {}): RecognizerController {
  const speechConfig = buildSpeechConfig();
  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.sessionStarted = () => callbacks.onSessionStarted?.();
  recognizer.sessionStopped = () => callbacks.onSessionStopped?.();

  recognizer.recognizing = (_s, e) => {
    if (e.result?.text) {
      callbacks.onRecognizing?.({ text: e.result.text });
    }
  };

  recognizer.recognized = (_s, e) => {
    if (e.result?.reason === sdk.ResultReason.RecognizedSpeech) {
      const text = e.result.text;
      const confidence = (e.result as any).confidence as number | undefined; // not always available
      callbacks.onRecognized?.({ text, confidence });
    } else if (e.result?.reason === sdk.ResultReason.NoMatch) {
      callbacks.onRecognized?.({ text: '', confidence: 0 });
    }
  };

  recognizer.canceled = (_s, e) => {
    callbacks.onCanceled?.({ code: e.errorCode?.toString?.() ?? 'Canceled', message: e.errorDetails ?? 'Recognizer canceled' });
  };

  return {
    start: () => new Promise<void>((resolve, reject) => {
      recognizer.startContinuousRecognitionAsync(() => resolve(), (err) => reject(err));
    }),
    stop: () => new Promise<void>((resolve, reject) => {
      recognizer.stopContinuousRecognitionAsync(() => resolve(), (err) => reject(err));
    }),
    dispose: () => {
      recognizer.close();
    },
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\'/g, '&apos;');
}

// Strip Markdown符號、星號、括號內容，並把多行合併為一句，避免第一播報讀出符號
function preprocessForSpeech(text: string): string {
  let s = text ?? '';
  // remove Markdown emphasis/code markers
  s = s.replace(/`+/g, '');
  s = s.replace(/\*\*+/g, '');
  s = s.replace(/__+/g, '');
  s = s.replace(/~~+/g, '');
  // remove Markdown headings
  s = s.replace(/^\s*#{1,6}\s*/gm, '');
  // remove list bullets
  s = s.replace(/^\s*[-*•]\s+/gm, '');
  // links/images: keep visible text
  s = s.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
  s = s.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // remove bracketed clauses
  s = s.replace(/（[^）]*）/g, '');
  s = s.replace(/\([^)]*\)/g, '');
  // strip other symbols
  s = s.replace(/[<>\[\]{}|]/g, '');
  // normalize lines -> sentences with pause
  const lines = s.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
  s = lines.join('。 ');
  // minor punctuation normalization
  s = s.replace(/：/g, '，');
  s = s.replace(/: /g, '，');
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}