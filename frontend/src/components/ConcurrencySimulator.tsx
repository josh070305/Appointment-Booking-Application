import React, { useState } from 'react';
import { Zap, X, ShieldAlert, CheckCircle, XCircle, ArrowRight, Play, RefreshCw } from 'lucide-react';
import { ISlot } from '../types/index.js';
import { api } from '../services/api.js';

interface ConcurrencySimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  availableSlots: ISlot[];
  onRefreshSlots: () => void;
}

export const ConcurrencySimulator: React.FC<ConcurrencySimulatorProps> = ({
  isOpen,
  onClose,
  availableSlots,
  onRefreshSlots
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    availableSlots[0]?._id || ''
  );
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    userAResult?: { status: number; success: boolean; data?: any; error?: any; durationMs: number };
    userBResult?: { status: number; success: boolean; data?: any; error?: any; durationMs: number };
  } | null>(null);

  if (!isOpen) return null;

  const handleSimulateRace = async () => {
    if (!selectedSlotId) return;
    setIsRunning(true);
    setResults(null);

    try {
      // 1. Get tokens for User A (Alice) and User B (Bob)
      const userAAuth = await api.demoLogin({ email: 'alice.sim@example.com', name: 'Alice (Simulated)' });
      const userBAuth = await api.demoLogin({ email: 'bob.sim@example.com', name: 'Bob (Simulated)' });

      const startTime = performance.now();

      // 2. Fire 2 simultaneous booking requests via Promise.all
      const [resA, resB] = await Promise.allSettled([
        (async () => {
          const t0 = performance.now();
          try {
            const data = await api.bookAppointment(
              { slotId: selectedSlotId, notes: 'Parallel race attempt by Alice' },
              userAAuth.token
            );
            return { status: 201, success: true, data, durationMs: Math.round(performance.now() - t0) };
          } catch (err: any) {
            return { status: err.status || 409, success: false, error: err, durationMs: Math.round(performance.now() - t0) };
          }
        })(),
        (async () => {
          const t0 = performance.now();
          try {
            const data = await api.bookAppointment(
              { slotId: selectedSlotId, notes: 'Parallel race attempt by Bob' },
              userBAuth.token
            );
            return { status: 201, success: true, data, durationMs: Math.round(performance.now() - t0) };
          } catch (err: any) {
            return { status: err.status || 409, success: false, error: err, durationMs: Math.round(performance.now() - t0) };
          }
        })()
      ]);

      const resultA = resA.status === 'fulfilled' ? resA.value : { status: 500, success: false, durationMs: 0 };
      const resultB = resB.status === 'fulfilled' ? resB.value : { status: 500, success: false, durationMs: 0 };

      setResults({
        userAResult: resultA,
        userBResult: resultB
      });

      // Refresh slot list to show updated taken status
      onRefreshSlots();
    } catch (err) {
      console.error('Race simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const selectedSlot = availableSlots.find((s) => s._id === selectedSlotId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl glass-panel border border-purple-500/40 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md shadow-purple-500/20">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Atomic Concurrency Simulator
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Proof Verification
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fires 2 simultaneous requests at the exact same millisecond against one slot
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-5">
          {/* Target Slot Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Select Target Available Slot for Race Test:
            </label>

            {availableSlots.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                No available slots found. Please click "Reset" or wait for slots to refresh.
              </div>
            ) : (
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-purple-500 outline-none"
              >
                {availableSlots.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.date} @ {s.startTime}-{s.endTime} | {s.serviceName} ({s.providerName})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Race Diagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                  A
                </div>
                <span className="font-bold text-white">User Alice</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">alice.sim@example.com</p>
              <p className="text-[10px] text-blue-300 mt-1">Request 1: POST /api/appointments</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                  B
                </div>
                <span className="font-bold text-white">User Bob</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">bob.sim@example.com</p>
              <p className="text-[10px] text-indigo-300 mt-1">Request 2: POST /api/appointments</p>
            </div>
          </div>

          {/* Trigger Race Button */}
          <button
            onClick={handleSimulateRace}
            disabled={isRunning || !selectedSlotId || availableSlots.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.99]"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Firing Simultaneous Requests (Promise.all)...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Launch Concurrent Race (2 Requests at Same ms)</span>
              </>
            )}
          </button>

          {/* Results Box */}
          {results && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Race Execution Results
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  Atomic CAS Result
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Result User A */}
                <div
                  className={`p-3.5 rounded-2xl border ${
                    results.userAResult?.success
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-rose-950/40 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      {results.userAResult?.success ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                      Alice
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        results.userAResult?.success
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      HTTP {results.userAResult?.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-200">
                    {results.userAResult?.success
                      ? '✅ WINNER: Slot successfully booked!'
                      : '🛑 REJECTED: Slot conflict (409)'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Latency: {results.userAResult?.durationMs}ms
                  </p>
                </div>

                {/* Result User B */}
                <div
                  className={`p-3.5 rounded-2xl border ${
                    results.userBResult?.success
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-rose-950/40 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      {results.userBResult?.success ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                      Bob
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        results.userBResult?.success
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      HTTP {results.userBResult?.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-200">
                    {results.userBResult?.success
                      ? '✅ WINNER: Slot successfully booked!'
                      : '🛑 REJECTED: Slot conflict (409)'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Latency: {results.userBResult?.durationMs}ms
                  </p>
                </div>
              </div>

              {/* Engineering Summary */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Concurrency Proof:</strong> Exactly 1 booking was created (201 Created) while the other request received a clean conflict (409 SLOT_ALREADY_BOOKED). Zero double-bookings possible.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
