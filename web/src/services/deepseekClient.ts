import { getDeepSeekApiKey } from '../config/local-config';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatOptions = {
  model?: string; // e.g., 'deepseek-chat'
  timeoutMs?: number; // default 15000
  retries?: number; // default 2
  endpoint?: string; // override if needed
};

export type ChatResult = {
  text: string;
  latencyMs: number;
  modelInfo?: { name: string };
  error?: { code: string; message: string };
};

const DEFAULT_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function sendChat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
  const apiKey = getDeepSeekApiKey();
  const model = options.model ?? 'deepseek-chat';
  const timeoutMs = options.timeoutMs ?? 15000;
  let endpoint = options.endpoint ?? DEFAULT_ENDPOINT;

  const start = performance.now();

  if (!apiKey) {
    // Graceful fallback: echo last user message to allow UI/dev without key
    const userMsg = messages.filter((m) => m.role === 'user').pop();
    const text = userMsg ? `（開發模式）你講：${userMsg.content}` : '（開發模式）未收到用戶訊息';
    return { text, latencyMs: Math.round(performance.now() - start), modelInfo: { name: 'dev-fallback' } };
  }

  const controller = new AbortController();
  const idTimeout = setTimeout(() => controller.abort(), timeoutMs);

  const payload = {
    model,
    messages,
    temperature: 0.7,
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const maxRetries = options.retries ?? 2;
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(idTimeout);

      if (!resp.ok) {
        const errText = await safeText(resp);
        throw new Error(`HTTP ${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      const choice = data?.choices?.[0];
      const text: string = choice?.message?.content ?? '';
      const latencyMs = Math.round(performance.now() - start);
      return { text, latencyMs, modelInfo: { name: model } };
    } catch (e: any) {
      lastError = e;
      if (attempt === maxRetries) break;
      await delay(Math.min(1000 * (attempt + 1), 3000));
      attempt += 1;
    }
  }

  return {
    text: '',
    latencyMs: Math.round(performance.now() - start),
    modelInfo: { name: model },
    error: { code: 'client_error', message: String(lastError?.message ?? lastError) },
  };
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return '<no body>';
  }
}