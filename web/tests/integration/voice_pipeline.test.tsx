import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPage from '../../src/pages/Chat';

// Mock local-config
vi.mock('../../src/config/local-config', () => ({
  getAzureKey: () => 'test-key',
  getAzureRegion: () => 'eastus',
  getTtsSettings: () => ({ ttsVoice: 'zh-HK-HiuMaanNeural', ttsRate: 1.0, ttsVolume: 0.75 }),
  loadConfig: () => ({ azure: { region: 'eastus', key: 'test-key' }, deepseek: { apiKey: 'dev' } }),
}));

// Mock DeepSeek client to return a fast reply
vi.mock('../../src/services/deepseekClient', () => ({
  sendChat: vi.fn(async () => ({ text: '好的，已收到。', latencyMs: 10, modelInfo: { name: 'deepseek-chat' } })),
}));

// Mock Azure SDK to drive recognizer and synthesizer
let lastRecognizer: any = null;
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  class SpeechConfig {
    static fromSubscription(key: string, region: string) { return new SpeechConfig(); }
    speechRecognitionLanguage = 'zh-HK';
    speechSynthesisVoiceName = 'zh-HK-HiuMaanNeural';
    speechSynthesisOutputFormat: any = null;
  }
  class AudioConfig { static fromDefaultMicrophoneInput() { return {}; } }
  const ResultReason = { RecognizedSpeech: 'RecognizedSpeech', NoMatch: 'NoMatch', SynthesizingAudioCompleted: 'SynthesizingAudioCompleted' } as const;
  const SpeechSynthesisOutputFormat = { Audio48Khz192KBitRateMonoMp3: 'mp3' } as const;
  class SpeechRecognizer {
    sessionStarted: any; sessionStopped: any; recognizing: any; recognized: any; canceled: any;
    constructor(_cfg?: any, _audio?: any) { lastRecognizer = this; }
    startContinuousRecognitionAsync(onSuccess: () => void, _onError: (err: any) => void) { this.sessionStarted?.(); onSuccess(); }
    stopContinuousRecognitionAsync(onSuccess: () => void, _onError: (err: any) => void) { this.sessionStopped?.(); onSuccess(); }
    close() {}
  }
  class SpeechSynthesisResult { constructor(public audioData: Uint8Array, public reason: any, public errorDetails?: string) {} }
  class SpeechSynthesizer {
    speakSsmlAsync(ssml: string, onSuccess: (res: any) => void, onError: (err: any) => void) {
      // Return a small fake mp3 byte array
      const res = new SpeechSynthesisResult(new Uint8Array([1,2,3]), ResultReason.SynthesizingAudioCompleted);
      onSuccess(res);
    }
    close() {}
  }
  return { SpeechConfig, AudioConfig, SpeechRecognizer, SpeechSynthesizer, ResultReason, SpeechSynthesisOutputFormat, __test: { getLastRecognizer: () => lastRecognizer } };
});

// Stub play to ensure it resolves
const playSpy = vi.spyOn(globalThis.HTMLMediaElement.prototype, 'play').mockResolvedValue();

describe('voice pipeline integration', () => {
  it('should display partial, send to LLM, render assistant reply, and play TTS', async () => {
    render(<ChatPage />);

    const micBtn = screen.getByRole('button', { name: /開始 語音/i });
    fireEvent.click(micBtn);

    // Drive partial event
    const sdk = await import('microsoft-cognitiveservices-speech-sdk');
    const rec = (sdk as any).__test.getLastRecognizer();
    rec.recognizing?.(null, { result: { text: '測試中...' } });

    await screen.findByText('測試中...');
    expect(screen.queryByText('測試中...')).toBeTruthy();

    // Drive final recognized
    rec.recognized?.(null, { result: { reason: (sdk as any).ResultReason.RecognizedSpeech, text: '請問今天天氣' } });

    // Should render assistant reply from mocked DeepSeek
    await waitFor(async () => {
      await screen.findByText('好的，已收到。');
      expect(screen.queryByText('好的，已收到。')).toBeTruthy();
    });

    // Should have attempted to play audio
    expect(playSpy).toHaveBeenCalled();
  });
});