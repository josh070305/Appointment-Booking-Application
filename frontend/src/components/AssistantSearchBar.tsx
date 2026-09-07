import React, { useState } from 'react';
import { Sparkles, Search, ArrowRight, X, Bot, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import { IAssistantResult } from '../types/index.js';

interface AssistantSearchBarProps {
  onApplyFilters: (parsed: { date?: string; timeOfDay?: string; service?: string }) => void;
  onClearFilters: () => void;
}

const SAMPLE_QUERIES = [
  { text: 'Dental checkup tomorrow morning', icon: '🦷' },
  { text: 'Cardiology review next Monday afternoon', icon: '❤️' },
  { text: 'Physical therapy evening session', icon: '🏃' },
  { text: 'General doctor consultation today', icon: '🩺' }
];

export const AssistantSearchBar: React.FC<AssistantSearchBarProps> = ({
  onApplyFilters,
  onClearFilters
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<IAssistantResult | null>(null);

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    try {
      const result = await api.parseAssistantQuery(queryText.trim());
      setParsedResult(result);
      onApplyFilters({
        date: result.date,
        timeOfDay: result.timeOfDay,
        service: result.service
      });
    } catch (err) {
      console.error('Assistant parsing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setParsedResult(null);
    onClearFilters();
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-r from-blue-600/5 via-indigo-600/10 to-purple-600/5 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/60 p-5 sm:p-6 border border-indigo-200/80 dark:border-indigo-500/30 shadow-card relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                AI Smart Booking Assistant
              </h3>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                Gemini NLP
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type natural queries like "book dental checkup next Monday afternoon"
            </p>
          </div>
        </div>

        {parsedResult && (
          <button
            onClick={handleClear}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset Search</span>
          </button>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="relative flex items-center"
      >
        <div className="absolute left-4 text-slate-400 pointer-events-none">
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
          ) : (
            <Search className="h-4 w-4 text-indigo-500" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: 'Book me a cardiology consultation tomorrow morning'..."
          className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 transition-all outline-none shadow-xs"
        />

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/25"
        >
          <span>Find</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Quick Suggestion Chips */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 mr-0.5">Quick Examples:</span>
        {SAMPLE_QUERIES.map((sample) => (
          <button
            key={sample.text}
            type="button"
            onClick={() => {
              setQuery(sample.text);
              handleSearch(sample.text);
            }}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs flex items-center gap-1.5"
          >
            <span>{sample.icon}</span>
            <span>"{sample.text}"</span>
          </button>
        ))}
      </div>

      {/* Parsed Criteria Feedback Chip */}
      {parsedResult && (
        <div className="mt-3.5 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/40 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                {parsedResult.summary}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {parsedResult.service && (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                    Specialty: {parsedResult.service}
                  </span>
                )}
                {parsedResult.date && (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                    Date: {parsedResult.date}
                  </span>
                )}
                {parsedResult.timeOfDay && (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                    Time: {parsedResult.timeOfDay}
                  </span>
                )}
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Engine: {parsedResult.source}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleClear}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
};
