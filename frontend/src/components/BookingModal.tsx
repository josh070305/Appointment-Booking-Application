import React, { useState } from 'react';
import { Calendar, CalendarDays, CheckCircle2, Clock3, Download, ExternalLink, Loader2, MapPin, ShieldCheck, X } from 'lucide-react';
import { IAppointment, ISlot } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

interface BookingModalProps { 
  slot: ISlot | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirmBooking: (slotId: string, notes: string) => Promise<{ success: boolean; appointment?: IAppointment; error?: any }>; 
  onViewAppointments: () => void; 
}

export const BookingModal: React.FC<BookingModalProps> = ({ 
  slot, 
  isOpen, 
  onClose, 
  onConfirmBooking, 
  onViewAppointments 
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen || !slot) return null;

  const close = () => { 
    setNotes(''); 
    setError(null); 
    setConfirmed(false); 
    onClose(); 
  };

  const confirm = async () => { 
    setSubmitting(true); 
    setError(null); 
    const result = await onConfirmBooking(slot._id, notes); 
    setSubmitting(false); 
    if (result.success) {
      setConfirmed(true); 
    } else {
      setError(result.error?.message || 'This time is no longer available. Please choose another time.'); 
    }
  };

  const date = new Date(`${slot.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Generate Google Calendar Add URL
  const getGoogleCalendarUrl = () => {
    const [startH, startM] = slot.startTime.split(':');
    const [endH, endM] = slot.endTime.split(':');
    const startIso = `${slot.date.replace(/-/g, '')}T${startH}${startM}00`;
    const endIso = `${slot.date.replace(/-/g, '')}T${endH}${endM}00`;

    const title = encodeURIComponent(`${slot.serviceName} with ${slot.providerName}`);
    const details = encodeURIComponent(`Appointment booked via AcuSlot.\nProvider: ${slot.providerName}\nLocation: ${slot.location}`);
    const location = encodeURIComponent(slot.location);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  // Generate and download .ics iCalendar file
  const downloadIcsFile = () => {
    const [startH, startM] = slot.startTime.split(':');
    const [endH, endM] = slot.endTime.split(':');
    const startIso = `${slot.date.replace(/-/g, '')}T${startH}${startM}00`;
    const endIso = `${slot.date.replace(/-/g, '')}T${endH}${endM}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AcuSlot//Appointment Booking System//EN',
      'BEGIN:VEVENT',
      `UID:${slot._id}-${Date.now()}@acuslot.internal`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:${slot.serviceName} with ${slot.providerName}`,
      `DESCRIPTION:Appointment confirmed with ${slot.providerName} via AcuSlot.`,
      `LOCATION:${slot.location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointment-${slot.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm appointment" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {confirmed ? 'All set' : 'Review appointment'}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">
              {confirmed ? 'Your appointment is confirmed' : 'Confirm your time'}
            </h2>
          </div>
          <button onClick={close} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {confirmed ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
              We’ll see you on {date}.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A confirmation has been saved and your slot is permanently reserved.
            </p>

            {/* Calendar Export Affordance */}
            <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Sync with your calendar
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <ExternalLink className="h-3 w-3 text-indigo-500" /> Google Cal
                </a>
                <button
                  onClick={downloadIcsFile}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Download className="h-3 w-3 text-indigo-500" /> Download .ics
                </button>
              </div>
            </div>

            <button 
              onClick={() => { close(); onViewAppointments(); }} 
              className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500"
            >
              View My Appointments
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{slot.serviceName}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">with {slot.providerName}</p>
              <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-indigo-500" />{date}</p>
                <p className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-indigo-500" />{slot.startTime}–{slot.endTime} · {slot.durationMinutes} minutes</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-indigo-500" />{slot.location}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Booking for <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name}</span></p>
            <label className="mt-4 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              A note for the provider <span className="font-normal text-slate-400">(optional)</span>
              <textarea 
                value={notes} 
                onChange={event => setNotes(event.target.value)} 
                maxLength={500} 
                rows={3} 
                placeholder="Anything the provider should know?" 
                className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
              />
            </label>
            {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
            <p className="mt-4 flex gap-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              Your time is confirmed atomically with optimistic version checks, eliminating double-bookings.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={close} 
                disabled={submitting} 
                className="rounded-lg px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Not now
              </button>
              <button 
                onClick={confirm} 
                disabled={submitting} 
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? 'Confirming…' : 'Confirm appointment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
