import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Image,
  Zap,
} from 'lucide-react';
import { CannedResponsePicker } from './CannedResponsePicker';
import { useCannedResponses } from '../../hooks/useCannedResponses';

interface MessageInputProps {
  onSend: (content: string) => void;
  conversationId: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, conversationId, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [cannedSearchQuery, setCannedSearchQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { responses } = useCannedResponses();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }

    if (e.key === '/' && message === '') {
      e.preventDefault();
      setShowCannedResponses(true);
      setCannedSearchQuery('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (value.startsWith('/') && value.length > 1) {
      const query = value.slice(1);
      setCannedSearchQuery(query);
      setShowCannedResponses(true);
    } else if (!value.startsWith('/')) {
      setShowCannedResponses(false);
    }
  };

  const handleSelectCannedResponse = (content: string) => {
    setMessage(content);
    setShowCannedResponses(false);
    setCannedSearchQuery('');
    textareaRef.current?.focus();
  };

  return (
    <div className="p-4 bg-white dark:bg-surface-dark-secondary border-t border-gray-100 dark:border-gray-800">
      <form onSubmit={handleSubmit} className="relative">
        {showCannedResponses && (
          <CannedResponsePicker
            responses={responses}
            onSelect={handleSelectCannedResponse}
            onClose={() => {
              setShowCannedResponses(false);
              setCannedSearchQuery('');
              if (message.startsWith('/')) {
                setMessage('');
              }
            }}
            searchQuery={cannedSearchQuery}
          />
        )}

        <div className="flex items-end gap-3">
          <div className="flex gap-1">
            <button
              type="button"
              className="p-2.5 text-text-tertiary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="p-2.5 text-text-tertiary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors"
              title="Send image"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowCannedResponses(!showCannedResponses)}
              className={`p-2.5 rounded-lg transition-colors ${
                showCannedResponses
                  ? 'text-maqsam-coral bg-maqsam-coral/10'
                  : 'text-text-tertiary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary'
              }`}
              title="Quick responses (Press /)"
            >
              <Zap className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Press / for quick responses)"
              rows={1}
              disabled={disabled}
              className="w-full px-4 py-2.5 pr-10 bg-surface-secondary dark:bg-surface-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-xl resize-none text-text-primary dark:text-text-dark-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-maqsam-coral/30 focus:border-maqsam-coral disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-3 bg-maqsam-coral hover:bg-maqsam-coral-dark text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2 flex items-center text-[11px] text-text-tertiary">
          <span>
            <kbd className="px-1.5 py-0.5 bg-surface-tertiary dark:bg-surface-dark-tertiary rounded font-mono">Enter</kbd> to send
            <span className="mx-2">|</span>
            <kbd className="px-1.5 py-0.5 bg-surface-tertiary dark:bg-surface-dark-tertiary rounded font-mono">Shift+Enter</kbd> new line
          </span>
        </div>
      </form>
    </div>
  );
}
