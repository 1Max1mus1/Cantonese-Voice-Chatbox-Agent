import type { ChatMessage } from './deepseekClient';

const FILLERS = ['嗯', '唔', '嗱', '啦', '囉', '啊', '呀', '喎', '噉', '咁', '係咪'];

export function normalizeCantoneseText(input: string): string {
  let s = input.trim();
  // remove filler words at ends and collapses spaces
  s = s
    .replace(/[ ]+/g, ' ')
    .replace(/[，、。]{2,}/g, '，')
    .replace(/([!?！？]){2,}/g, '$1');
  // remove leading filler
  s = s.replace(new RegExp(`^(${FILLERS.join('|')})[\s,，]*`), '');
  // remove trailing filler
  s = s.replace(new RegExp(`[\s,，]*(${FILLERS.join('|')})$`), '');
  return s;
}

export function buildSystemPrompt(): string {
  return [
    '你係一個友善、簡潔嘅粵語助手，主要用繁體中文回應。',
    '規則：',
    '1) 用簡短句子，口語但清晰。',
    '2) 如問題含糊，先用一句粵語提出澄清。',
    '3) 優先粵語用詞（例如「喺」、「唔該」、「點樣」）。',
    '4) 如需要步驟，列表化，但保持簡潔。',
  ].join('\n');
}

export function buildMessages(history: ChatMessage[], userText?: string): ChatMessage[] {
  const sys: ChatMessage = { role: 'system', content: buildSystemPrompt() };
  const normalized = userText ? normalizeCantoneseText(userText) : undefined;
  const trimmedHistory: ChatMessage[] = history.map((m) => ({ role: m.role, content: m.content.trim() })).slice(-12);
  if (normalized) {
    trimmedHistory.push({ role: 'user', content: normalized });
  }
  return [sys, ...trimmedHistory];
}