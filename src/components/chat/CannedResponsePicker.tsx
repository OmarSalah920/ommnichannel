import { useState, useEffect, useRef } from 'react';
import { Search, Zap, X, Hash } from 'lucide-react';
import type { CannedResponse } from '../../types/database';

interface CannedResponsePickerProps {
  responses: CannedResponse[];
  onSelect: (content: string) => void;
  onClose: () => void;
  searchQuery?: string;
}

export function CannedResponsePicker({
  responses,
  onSelect,
  onClose,
  searchQuery: initialQuery = '',
}: CannedResponsePickerProps) {
  const [search, setSearch] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredResponses = responses.filter((r) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      r.content.toLowerCase().includes(query)
    );
  });

  const groupedResponses = filteredResponses.reduce((acc, response) => {
    const category = response.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(response);
    return acc;
  }, {} as Record<string, CannedResponse[]>);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredResponses.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredResponses[selectedIndex]) {
      e.preventDefault();
      onSelect(filteredResponses[selectedIndex].content);
    }
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-surface-dark-secondary rounded-xl border border-gray-100 dark:border-gray-700 shadow-strong overflow-hidden z-50 animate-slide-up">
      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-maqsam-coral/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-maqsam-coral" />
            </div>
            <span className="font-semibold text-text-primary dark:text-text-dark-primary">Quick Responses</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search responses..."
            className="w-full pl-9 pr-4 py-2 bg-surface-secondary dark:bg-surface-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-text-primary dark:text-text-dark-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-maqsam-coral/30 focus:border-maqsam-coral transition-all"
          />
        </div>
      </div>

      <div ref={listRef} className="max-h-64 overflow-y-auto scrollbar-thin">
        {Object.keys(groupedResponses).length === 0 ? (
          <div className="p-6 text-center">
            <Zap className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-50" />
            <p className="text-sm text-text-tertiary">No responses found</p>
          </div>
        ) : (
          Object.entries(groupedResponses).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-2 bg-surface-secondary dark:bg-surface-dark-tertiary border-b border-gray-100 dark:border-gray-700">
                <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  {category}
                </span>
              </div>
              {items.map((response) => {
                const globalIndex = filteredResponses.indexOf(response);
                return (
                  <button
                    key={response.id}
                    onClick={() => onSelect(response.content)}
                    className={`w-full px-3 py-2.5 text-left transition-colors border-b border-gray-50 dark:border-gray-800 last:border-b-0 ${
                      globalIndex === selectedIndex
                        ? 'bg-maqsam-coral/5 dark:bg-maqsam-coral/10'
                        : 'hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary dark:text-text-dark-primary text-sm mb-0.5">
                          {response.title}
                        </p>
                        <p className="text-sm text-text-secondary dark:text-text-dark-secondary truncate">
                          {response.content}
                        </p>
                      </div>
                      {response.is_global && (
                        <span className="px-1.5 py-0.5 bg-maqsam-coral/10 text-maqsam-coral rounded text-[10px] font-semibold flex-shrink-0">
                          Global
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-surface-secondary dark:bg-surface-dark-tertiary">
        <p className="text-[11px] text-text-tertiary text-center">
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-surface-dark-secondary border border-gray-200 dark:border-gray-700 rounded font-mono">Enter</kbd>
          {' '}select
          <span className="mx-2">|</span>
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-surface-dark-secondary border border-gray-200 dark:border-gray-700 rounded font-mono">Esc</kbd>
          {' '}close
        </p>
      </div>
    </div>
  );
}
