import React from 'react';
import { Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { IAvailableDate } from '../types/index.js';

interface DateRibbonProps {
  availableDates: IAvailableDate[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  isLoading: boolean;
}

export const DateRibbon: React.FC<DateRibbonProps> = ({
  availableDates,
  selectedDate,
  onSelectDate,
  isLoading
}) => {
  // Format date helper
  const formatDateLabel = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = date.toDateString() === today.toDateString();

      const tmrw = new Date(today);
      tmrw.setDate(tmrw.getDate() + 1);
      const isTomorrow = date.toDateString() === tmrw.toDateString();

      const dayName = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });

      return { dayName, dayNumber: day, monthName, isToday };
    } catch {
      return { dayName: 'Date', dayNumber: '', monthName: '', isToday: false };
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Calendar className="h-4 w-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-wider uppercase">
            Choose Appointment Date
          </h3>
        </div>
        <button
          onClick={() => onSelectDate(null)}
          className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
            selectedDate === null
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800'
          }`}
        >
          All Available Dates
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-24 h-24 rounded-3xl bg-slate-200 dark:bg-slate-800/50 animate-pulse border border-slate-300 dark:border-slate-800"
            />
          ))}
        </div>
      ) : availableDates.length === 0 ? (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-center text-xs text-slate-400">
          No dates with open slots found.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {availableDates.map((item) => {
            const { dayName, dayNumber, monthName, isToday } = formatDateLabel(item.date);
            const isSelected = selectedDate === item.date;

            return (
              <button
                key={item.date}
                onClick={() => onSelectDate(item.date)}
                className={`flex-shrink-0 w-24 sm:w-28 p-3.5 rounded-3xl border text-center transition-all flex flex-col items-center justify-between group relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 scale-105 z-10 ring-2 ring-blue-400/40'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:shadow-card hover:bg-blue-50/40 dark:hover:bg-slate-800'
                }`}
              >
                {isToday && (
                  <span
                    className={`absolute top-2 right-2 h-2 w-2 rounded-full ${
                      isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                    } animate-ping`}
                  />
                )}

                <span
                  className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600'
                  }`}
                >
                  {dayName}
                </span>

                <div className="my-1.5">
                  <span className="text-2xl font-black block leading-none">
                    {dayNumber}
                  </span>
                  <span
                    className={`text-[11px] font-semibold block ${
                      isSelected ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {monthName}
                  </span>
                </div>

                <div
                  className={`mt-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isSelected
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/25 group-hover:bg-blue-600 group-hover:text-white group-hover:border-transparent'
                  }`}
                >
                  {item.availableCount} slots
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
