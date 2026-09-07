import React, { useState } from 'react';
import { X, AlertCircle, Trash2, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { IAppointment } from '../types/index.js';

interface CancelModalProps {
  appointment: IAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (id: string, reason?: string) => Promise<void>;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onConfirmCancel
}) => {
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !appointment) return null;

  const slot = appointment.slotId;

  const handleCancel = async () => {
    setIsCancelling(true);
    setErrorMsg(null);
    try {
      await onConfirmCancel(appointment._id, reason);
      setReason('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl glass-panel border border-rose-500/30 p-6 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-base font-bold text-white">Cancel Appointment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4">
          <p className="text-xs text-slate-300">
            Are you sure you want to cancel your appointment? The slot will immediately return to the available pool for other patients to book.
          </p>

          {/* Appointment Preview Box */}
          {slot && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
              <p className="font-bold text-white text-sm">{slot.serviceName}</p>
              <p className="text-slate-300">
                {slot.date} @ {slot.startTime} - {slot.endTime}
              </p>
              <p className="text-slate-400">{slot.providerName} • {slot.location}</p>
            </div>
          )}

          {/* Cancellation Reason input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Reason for Cancellation <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Schedule conflict, feeling better, or need to reschedule for next week..."
              rows={2}
              className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs text-white placeholder:text-slate-500 transition-all outline-none resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isCancelling}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Keep Appointment
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Confirm Cancellation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
