import { Check, CheckCheck, Clock, AlertCircle, Image, FileText, Play, Mic } from 'lucide-react';
import type { Message } from '../../types/database';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.sender_type === 'agent' || message.sender_type === 'bot';

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    const status = message.status;

    switch (status) {
      case 'sending':
      case 'enqueued':
        return <Clock className="w-3.5 h-3.5 text-white/70 animate-pulse" />;

      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-red-300" />;

      case 'sent':
        return <Check className="w-3.5 h-3.5 text-white/70" />;

      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-white/70" />;

      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />;

      default:
        return <Clock className="w-3.5 h-3.5 text-white/70 animate-pulse" />;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Play className="w-4 h-4" />;
      case 'audio':
        return <Mic className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (message.sender_type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-1.5 bg-surface-tertiary dark:bg-surface-dark-tertiary rounded-full text-xs text-text-secondary dark:text-text-dark-secondary font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending' || message.status === 'enqueued';

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 shadow-soft ${
          isOutgoing
            ? isFailed
              ? 'bg-red-500 text-white rounded-2xl rounded-br-md'
              : isSending
                ? 'bg-maqsam-coral/70 text-white rounded-2xl rounded-br-md'
                : 'bg-maqsam-coral text-white rounded-2xl rounded-br-md'
            : 'bg-white dark:bg-surface-dark-tertiary text-text-primary dark:text-text-dark-primary border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-md'
        }`}
      >
        {message.sender_type === 'bot' && (
          <p className="text-xs font-medium mb-1 opacity-70">Bot</p>
        )}

        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

        <div
          className={`flex items-center justify-end gap-1.5 mt-1.5 ${
            isOutgoing ? 'text-white/70' : 'text-text-tertiary'
          }`}
        >
          <span className="text-[11px]">{formatTime(message.created_at)}</span>
          {isOutgoing && getStatusIcon()}
        </div>
      </div>
    </div>
  );
}
