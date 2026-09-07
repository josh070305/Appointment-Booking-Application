import React from 'react';
import { ArrowUpRight, Clock, MapPin, Stethoscope, X, CheckCircle2 } from 'lucide-react';
import { ISlot } from '../types/index.js';

interface SlotCardProps {
  slot: ISlot;
  onSelectBook: (slot: ISlot) => void;
  isBooking?: boolean;
}

export const SlotCard: React.FC<SlotCardProps> = ({ slot, onSelectBook, isBooking }) => {
  const isAvailable = slot.status === 'AVAILABLE';
  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <article
      className={`group rounded-3xl border border-slate-200 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        ${isAvailable
          ? 'border-slate-200 dark:border-slate-800'
          : 'border-slate-300 dark:border-slate-700/50 opacity-75'}
      `}
    >
      {/* Top Banner: Service icon, Specialty Badge & Status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              {slot.serviceName}
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-1">
              {formatDate(slot.date)}
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs
            ${isAvailable
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700/50'}
          `}
        >
          {isAvailable ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Available
            </>
          ) : (
            'Booked'
          )}
        </span>
      </div>

      {/* Doctor & Location Info */}
      <div className="my-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center">
              MD
            </div>
            <span className="font-bold text-xs text-slate-900 dark:text-white">{slot.providerName}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-500/20">
            <Stethoscope className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>4.9</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{slot.location}</span>
        </div>
      </div>

      {/* Bottom Section: Time, Price, & Action Button */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Clock className="h-3 w-3" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">
                {slot.startTime} - {slot.endTime}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 ml-1.5">
                ({slot.durationMinutes} mins)
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              ${slot.price}
            </span>
          </div>
        </div>

        <button
          onClick={() => onSelectBook(slot)}
          disabled={!isAvailable || isBooking}
          className={`w-full py-3 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-xs
            ${isAvailable
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/25 active:scale-[0.98]'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700/50'}
          `}
          aria-label={isAvailable ? 'Book this slot' : 'This slot is already booked'}
        >
          {isAvailable ? (
            <>
              <span>Select & Book Slot</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          ) : (
            <>
              <X className="h-3.5 w-3.5 text-slate-400" />
              <span className="ml-2">Slot Unavailable</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};