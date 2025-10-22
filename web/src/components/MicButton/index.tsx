import { useCallback, useEffect, useRef, useState } from 'react';
import { createRecognizer } from '../../services/azureSpeech';
import type { RecognizerController } from '../../services/azureSpeech';
import { unlockAudioWithGesture } from '../../services/audio';

export type MicButtonProps = {
  onStart?: () => void;
  onStop?: () => void;
  onPartialTranscript?: (text: string) => void;
  onFinalText?: (text: string, confidence?: number) => void;
  onError?: (message: string) => void;
};

export default function MicButton(props: MicButtonProps) {
  const controllerRef = useRef<RecognizerController | null>(null);
  const [listening, setListening] = useState(false);

  const lastFinalTextRef = useRef<string>('');
  const lastFinalAtRef = useRef<number>(0);
  const lastFinalEmitAtRef = useRef<number>(0);
  const listeningRef = useRef<boolean>(false);
  const restartingRef = useRef<boolean>(false);
  // 收集本次手動會話的最終片段，僅在手動停止時一併打包發送
  const finalBufferRef = useRef<string[]>([]);
  
  const startListening = useCallback(async () => {
    try {
      await unlockAudioWithGesture();
      // reset dedup state when starting a new session
      lastFinalTextRef.current = '';
      lastFinalAtRef.current = 0;
      lastFinalEmitAtRef.current = 0;
      // 本次會話的片段緩存
      finalBufferRef.current = [];

      const controller = createRecognizer({
        onRecognizing: (e) => props.onPartialTranscript?.(e.text),
        onRecognized: (e) => {
          // ignore stray events if not actively listening
          if (!listeningRef.current) return;
          const text = (e.text || '').trim();
          if (!text) return;
          const now = Date.now();
          // 僅做重覆文本去重（2.5s 窗口），不再即時發送；累積到 finalBuffer
          if (lastFinalTextRef.current === text && now - lastFinalAtRef.current < 2500) {
            return;
          }
          lastFinalTextRef.current = text;
          lastFinalAtRef.current = now;
          finalBufferRef.current.push(text);
          // 最終文本不在此時發送，僅更新 UI 的 partial（可選）
          // props.onPartialTranscript?.(''); // 如需清空臨時顯示可解注
        },
        onSessionStopped: () => {
          // auto-restart continuous recognition if it stopped unexpectedly
          if (listeningRef.current && controllerRef.current && !restartingRef.current) {
            restartingRef.current = true;
            setTimeout(async () => {
              try {
                if (listeningRef.current && controllerRef.current) {
                  await controllerRef.current.start();
                }
              } catch (err: any) {
                props.onError?.(String(err?.message ?? err));
              } finally {
                restartingRef.current = false;
              }
            }, 200);
          }
        },
        onCanceled: (e) => {
          props.onError?.(`${e.code}: ${e.message}`);
          // try to resume if still listening
          if (listeningRef.current && controllerRef.current && !restartingRef.current) {
            restartingRef.current = true;
            setTimeout(async () => {
              try {
                if (listeningRef.current && controllerRef.current) {
                  await controllerRef.current.start();
                }
              } catch (err: any) {
                props.onError?.(String(err?.message ?? err));
              } finally {
                restartingRef.current = false;
              }
            }, 200);
          }
        },
      });
      controllerRef.current = controller;
      await controller.start();
      listeningRef.current = true;
      setListening(true);
      props.onStart?.();
    } catch (e: any) {
      props.onError?.(String(e?.message ?? e));
    }
  }, [props]);

  const stopListening = useCallback(async () => {
    try {
      listeningRef.current = false;
      restartingRef.current = false;
      await controllerRef.current?.stop();
    } catch {}
    controllerRef.current?.dispose();
    controllerRef.current = null;
    setListening(false);
    // 在手動停止時，把本次累積的片段打包發送給 AI
    const aggregated = finalBufferRef.current.join('\n').trim();
    if (aggregated) {
      try {
        props.onFinalText?.(aggregated);
      } catch {}
    }
    finalBufferRef.current = [];
    props.onStop?.();
  }, [props]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      try {
        listeningRef.current = false;
        restartingRef.current = false;
        controllerRef.current?.dispose();
      } catch {}
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => (listening ? stopListening() : startListening())}
      className={`rounded-full px-6 py-3 text-white shadow transition-colors ${
        listening ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700'
      }`}
      aria-pressed={listening}
    >
      <span className="inline-flex items-center gap-2">
        <MicIcon />
        {listening ? '停止' : '開始'} 語音
      </span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2Z" />
    </svg>
  );
}