import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRecognizer } from '../../src/services/azureSpeech';

// Mock local-config to supply credentials and TTS defaults
vi.mock('../../src/config/local-config', () => ({
  getAzureKey: () => 'test-key',
  getAzureRegion: () => 'eastus',
  getTtsSettings: () => ({ ttsVoice: 'zh-HK-HiuMaanNeural', ttsRate: 1.0, ttsVolume: 0.75 }),
}));

// Capture last recognizer instance for driving events
let lastRecognizer: any = null;

vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  class SpeechConfig {
    static fromSubscription(key: string, region: string) {
      return new SpeechConfig();
    }
    speechRecognitionLanguage = 'zh-HK';
    speechSynthesisVoiceName = 'zh-HK-HiuMaanNeural';
    speechSynthesisOutputFormat: any = null;
  }
  class AudioConfig {
    static fromDefaultMicrophoneInput() {
      return {} as any;
    }
  }
  const ResultReason = {
    RecognizedSpeech: 'RecognizedSpeech',
    NoMatch: 'NoMatch',
    SynthesizingAudioCompleted: 'SynthesizingAudioCompleted',
  } as const;
  const SpeechSynthesisOutputFormat = { Audio48Khz192KBitRateMonoMp3: 'mp3' } as const;

  class SpeechRecognizer {
    sessionStarted: any;
    sessionStopped: any;
    recognizing: any;
    recognized: any;
    canceled: any;
    constructor(_cfg?: any, _audio?: any) { lastRecognizer = this; }
    startContinuousRecognitionAsync(onSuccess: () => void, _onError: (err: any) => void) {
      this.sessionStarted?.();
      onSuccess();
    }
    stopContinuousRecognitionAsync(onSuccess: () => void, _onError: (err: any) => void) {
      this.sessionStopped?.();
      onSuccess();
    }
    close() {}
  }

  class SpeechSynthesizer {}

  return { SpeechConfig, AudioConfig, SpeechRecognizer, SpeechSynthesizer, ResultReason, SpeechSynthesisOutputFormat, __test: { getLastRecognizer: () => lastRecognizer } };
});

describe('azureSpeech recognizer events', () => {
  beforeEach(() => {
    lastRecognizer = null;
  });

  it('should trigger callbacks on start, recognizing, recognized, canceled, stop', async () => {
    const onStart = vi.fn();
    const onPartial = vi.fn();
    const onFinal = vi.fn();
    const onCanceled = vi.fn();
    const onStop = vi.fn();

    const controller = createRecognizer({
      onSessionStarted: onStart,
      onRecognizing: (e) => onPartial(e.text),
      onRecognized: (e) => onFinal(e.text, e.confidence),
      onCanceled: (e) => onCanceled(`${e.code}:${e.message}`),
      onSessionStopped: onStop,
    });

    await controller.start();
    expect(onStart).toHaveBeenCalledTimes(1);

    // drive partial event
    const sdk = await import('microsoft-cognitiveservices-speech-sdk');
    const rec = (sdk as any).__test.getLastRecognizer();
    rec.recognizing?.(null, { result: { text: '部分語音' } });
    expect(onPartial).toHaveBeenCalledWith('部分語音');

    // final recognized
    rec.recognized?.(null, { result: { reason: (sdk as any).ResultReason.RecognizedSpeech, text: '完成語音' } });
    expect(onFinal).toHaveBeenCalledWith('完成語音', undefined);

    // canceled
    rec.canceled?.(null, { errorCode: { toString: () => '500' }, errorDetails: 'Mic error' });
    expect(onCanceled).toHaveBeenCalledWith('500:Mic error');

    await controller.stop();
    expect(onStop).toHaveBeenCalledTimes(1);

    controller.dispose();
  });
});