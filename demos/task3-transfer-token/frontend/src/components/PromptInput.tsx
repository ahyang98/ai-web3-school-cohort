import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Send, Loader2 } from 'lucide-react';

interface Props {
  onSend: (prompt: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export function PromptInput({ onSend, loading, disabled }: Props) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!prompt.trim()) {
      setError('请输入指令');
      return;
    }
    onSend(prompt.trim());
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-start">
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="输入自然语言指令，例如:&#10;看看我的 T3T 余额&#10;转 50 T3T 给 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
              className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 resize-none outline-none text-sm min-h-[60px] leading-relaxed"
              rows={3}
              disabled={loading || disabled}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={loading || disabled || !prompt.trim()}
            className="shrink-0 mt-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-zinc-600 text-xs mt-2">Enter 发送 · Shift+Enter 换行</p>
      </CardContent>
    </Card>
  );
}
