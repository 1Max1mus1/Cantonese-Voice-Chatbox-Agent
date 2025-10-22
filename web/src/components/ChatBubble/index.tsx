import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export type ChatBubbleProps = {
  role: 'user' | 'assistant';
  text: string;
  time?: string; // optional display time
};

export default function ChatBubble({ role, text, time }: ChatBubbleProps) {
  const isUser = role === 'user';
  const icon = isUser ? '🙂' : '🤖';
  return (
    <div className="w-full my-2">
      <div className="flex items-start gap-2 md:gap-3">
        <div className="text-lg md:text-xl leading-none select-none">{icon}</div>
        <div
          className={`flex-1 notion-card px-3 md:px-4 py-2.5 md:py-3 text-[15px] md:text-[16px] leading-relaxed md:leading-relaxed ${
            isUser ? 'bg-gray-50' : 'bg-white'
          }`}
        >
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
          {time && <p className="mt-1 text-xs notion-muted">{time}</p>}
        </div>
      </div>
    </div>
  );
}