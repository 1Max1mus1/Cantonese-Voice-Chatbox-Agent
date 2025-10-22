import { useEffect, useRef, useState } from 'react';
import ChatBubble from '../../components/ChatBubble';
import MicButton from '../../components/MicButton';
import { sendChat } from '../../services/deepseekClient';
import type { ChatMessage } from '../../services/deepseekClient';
import { speakToSpeaker } from '../../services/azureSpeech';
import { buildMessages } from '../../services/prompt';

const SESSION_KEY = 'cvc.session.messages.v1';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '你好，我係粵語語音助手。有乜可以幫到你？' },
  ]);
  const [partial, setPartial] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const lastSpokenTextRef = useRef<string>('');
  const lastSpokenAtRef = useRef<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  async function handleFinal(text: string) {
    if (!text?.trim()) return;
    // ignore new finals while assistant is processing to avoid concurrent requests/playbacks
    if (busy) return;
    setPartial('');
    const nextHistory: ChatMessage[] = [...messages, { role: 'user', content: text } as ChatMessage];
    setMessages(nextHistory);
    setBusy(true);
    setError('');
    try {
      const payload = buildMessages(nextHistory, text);
      const result = await sendChat(payload);
      const assistantText = result.text || '對唔住，我未能回應。';
      const withAssistant: ChatMessage[] = [...nextHistory, { role: 'assistant', content: assistantText } as ChatMessage];
      setMessages(withAssistant);
      try {
        const now = Date.now();
        // Deduplicate identical assistant speech within 4s window
        if (lastSpokenTextRef.current === assistantText && now - lastSpokenAtRef.current < 4000) {
          // skip playback to avoid repeated speech
        } else {
          lastSpokenTextRef.current = assistantText;
          lastSpokenAtRef.current = now;
          // 直接使用 Azure SDK 輸出到預設喇叭，自動播放
          await speakToSpeaker({ text: assistantText });
        }
      } catch (e: any) {
        console.warn('TTS/autoplay failed', e);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  function clearSession() {
    setMessages([{ role: 'assistant', content: '你好，我係粵語語音助手。有乜可以幫到你？' }]);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  return (
    <div className="min-h-screen">
      <div className="notion-page">
        <h1 className="text-xl md:text-2xl mb-2">粵語語音助手</h1>
        <p className="notion-muted mb-4">以粵語互動、語音識別與語音合成。</p>

        <div className="notion-card p-3 md:p-5 mb-4">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role === 'user' ? 'user' : 'assistant'} text={m.content} />
          ))}
          {partial && <ChatBubble role="user" text={partial} />}
        </div>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <MicButton
            onPartialTranscript={setPartial}
            onFinalText={(t) => handleFinal(t)}
            onError={(msg) => setError(msg)}
          />
          <button type="button" onClick={clearSession} className="text-sm text-gray-700 underline">清除對話</button>
          {busy && <p className="text-sm text-gray-500">思考中⋯⋯</p>}
        </div>

        {/* 刪除進度條與播放控制，改回 Azure 自動播放 */}
      </div>
    </div>
  );
}