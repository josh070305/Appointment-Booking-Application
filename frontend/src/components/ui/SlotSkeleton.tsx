import React from 'react';

const SlotSkeleton: React.FC = () => {
  return (
    <div className="rounded-3xl p-6 sm:p-8 border transition-all flex flex-col justify-between relative group">
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-slate-200" />
          <div className="space-y-1">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-2 w-16 rounded bg-slate-200 mt-1" />
          </div>
        </div>
        <div className="h-3 w-9 rounded-full bg-slate-200" />
      </div>

      {/* Doctor & Location Info */}
      <div className="my-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <div className="h-3 w-3 rounded-full bg-slate-200" />
            <div className="h-2 w-8 rounded bg-slate-200 ml-1" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <div className="h-3 w-3 rounded-full bg-slate-200" />
          <div className="h-2 w-24 rounded bg-slate-200" />
        </div>
      </div>

      {/* Bottom Section: Time, Price, & Action Button */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-slate-200" />
            <div className="space-y-1">
              <div className="h-2 w-24 rounded bg-slate-200" />
              <div className="h-1 w-16 rounded bg-slate-200 mt-1" />
            </div>
          </div>
          <div className="text-right">
            <div className="h-4 w-12 rounded bg-slate-200" />
          </div>
        </div>
        <button className="w-full py-3 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-xs bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed">
          <span className="animate-pulse">Loading...</span>
        </button>
      </div>
    </div>
  );
};

export default SlotSkeleton;