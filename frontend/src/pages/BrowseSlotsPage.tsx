import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, HeartPulse, RotateCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { api } from '../services/api.js';
import { ISlot } from '../types/index.js';
import { BookingModal } from '../components/BookingModal.js';
import { SlotCard } from '../components/SlotCard.js';
import { DateRibbon } from '../components/DateRibbon.js';
import { AssistantSearchBar } from '../components/AssistantSearchBar.js';
import SlotSkeleton from '../components/ui/SlotSkeleton.js';
import { toast } from 'sonner';

interface BrowseSlotsPageProps { onNavigateToAppointments: () => void; }
const times = [['ALL', 'Any time'], ['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']];

export const BrowseSlotsPage: React.FC<BrowseSlotsPageProps> = ({ onNavigateToAppointments }) => {
  const client = useQueryClient();
  const [date, setDate] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState('ALL');
  const [service, setService] = useState('ALL');
  const [selected, setSelected] = useState<ISlot | null>(null);
  const [showAll, setShowAll] = useState(false);
  const datesQuery = useQuery({ queryKey: ['available-dates'], queryFn: api.getAvailableDates });
  const slotsQuery = useQuery({
    queryKey: ['slots', date, timeOfDay, service],
    queryFn: () => api.getSlots({
      date: date || undefined,
      timeOfDay: timeOfDay === 'ALL' ? undefined : timeOfDay,
      service: service === 'ALL' ? undefined : service,
      status: 'AVAILABLE'
    })
  });
  const book = useMutation({
    mutationFn: (payload: { slotId: string; notes: string }) => api.bookAppointment(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['slots'] });
      client.invalidateQueries({ queryKey: ['available-dates'] });
      client.invalidateQueries({ queryKey: ['user-appointments'] });
      toast.success('Appointment booked!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to book appointment');
    }
  });
  const dates = datesQuery.data?.dates ?? [];
  const slots = slotsQuery.data?.slots ?? [];
  const visibleSlots = showAll ? slots : slots.slice(0, 6);
  const services = useMemo(() => Array.from(new Set(dates.flatMap(item => item.services))), [dates]);
  const clearFilters = () => { setDate(null); setTimeOfDay('ALL'); setService('ALL'); setShowAll(false); };
  const findSlots = () => { setShowAll(false); slotsQuery.refetch(); };

  const handleAssistantFilter = (parsed: { date?: string; timeOfDay?: string; service?: string }) => {
    if (parsed.date) setDate(parsed.date);
    if (parsed.timeOfDay) setTimeOfDay(parsed.timeOfDay);
    if (parsed.service) setService(parsed.service);
    toast.info('Smart filters applied from query');
  };

  // Set document title
  useEffect(() => {
    document.title = 'AcuSlot – Browse Appointments';
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <section className="relative grid overflow-hidden gap-8 rounded-3xl border border-white/70 bg-white/75 px-6 pb-16 pt-9 shadow-[0_24px_60px_-24px_rgba(37,116,128,.3)] backdrop-blur sm:px-10 sm:pt-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center dark:bg-slate-900/80 dark:border-slate-800">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />Atomic Real-time Booking
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl dark:text-white">
            Your health,<br />your time.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            Book appointments with live seat locks, zero double-bookings, and real-time updates across all devices.
          </p>
        </div>
        <div className="relative hidden min-h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-[#d8f2f4] via-[#eaf7f8] to-[#b9e5e9] dark:from-indigo-950/60 dark:via-slate-900 dark:to-indigo-900/40 lg:block">
          <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/55 dark:bg-indigo-600/10" />
          <div className="absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-[#64c2ca]/25 dark:bg-indigo-500/10" />
          <div className="absolute inset-x-10 bottom-8 rounded-2xl border border-white/80 bg-white/65 p-5 shadow-lg shadow-[#2aa9b8]/10 backdrop-blur dark:bg-slate-900/80 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <HeartPulse className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">Care, without the waiting room.</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a time and we will take care of the rest.</p>
              </div>
            </div>
          </div>
          <ShieldCheck className="absolute right-9 top-8 h-12 w-12 text-white/80 dark:text-indigo-400/40" />
        </div>
      </section>

      {/* AI Assistant Search Bar */}
      <AssistantSearchBar 
        onApplyFilters={handleAssistantFilter} 
        onClearFilters={clearFilters} 
      />

      {/* Interactive Horizontal Date Ribbon */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <DateRibbon 
          availableDates={dates} 
          selectedDate={date} 
          onSelectDate={(newDate) => setDate(newDate)} 
          isLoading={datesQuery.isLoading} 
        />
      </div>

      {/* Filters and Slot Grid */}
      <section className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Filters */}
        <aside className="w-full lg:w-64 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Date Filter
            </label>
            <select
              value={date ?? ''}
              onChange={(e) => setDate(e.target.value || null)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">All available dates</option>
              {dates.map(item => (
                <option key={item.date} value={item.date}>
                  {new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ({item.availableCount})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Time of day
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {times.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTimeOfDay(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all
                    ${timeOfDay === value
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
                  `}
                  aria-label={`Show ${label} slots`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Appointment type
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                key="ALL"
                onClick={() => setService('ALL')}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all
                  ${service === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
                `}
                aria-label="Show all services"
              >
                All services
              </button>
              {services.map((svc) => (
                <button
                  key={svc}
                  onClick={() => setService(svc)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all
                    ${service === svc
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
                `}
                aria-label={`Show ${svc} slots`}
                >
                  {svc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
              aria-label="Clear filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />Clear
            </button>
            <button
              onClick={findSlots}
              disabled={slotsQuery.isRefetching}
              className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-60"
            >
              {slotsQuery.isRefetching ? 'Finding...' : 'Find slots'}
            </button>
          </div>
        </aside>

        {/* Main Slot Grid */}
        <main className="flex-1 min-w-0">
          {slotsQuery.isLoading || datesQuery.isLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <SlotSkeleton key={i} />
              ))}
            </div>
          ) : slotsQuery.error ? (
            <div className="mt-5 text-center">
              <p className="text-sm font-bold text-slate-900">We could not load appointment times.</p>
              <p className="mt-1 text-xs text-slate-500">Please try again in a moment.</p>
              <button
                onClick={() => slotsQuery.refetch()}
                className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
                aria-label="Retry loading slots"
              >
                Try again
              </button>
            </div>
          ) : slots.length === 0 ? (
            <div className="mt-5 text-center">
              <div className="h-40 w-40 mx-auto">
                {/* Placeholder for illustration - you can replace with actual SVG */}
                <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                  <CalendarDays className="h-8 w-8 text-slate-400" />
                </div>
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">No times match these filters.</p>
              <p className="mt-1 text-xs text-slate-500">Try another date or appointment type.</p>
              <button
                onClick={clearFilters}
                className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
                aria-label="Reset filters to see all times"
              >
                Show all times
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleSlots.map(slot => (
                  <SlotCard key={slot._id} slot={slot} onSelectBook={setSelected} />
                ))}
              </div>
              {slots.length > 6 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-600 hover:text-white transition-all dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white"
                  >
                    {showAll ? 'Show fewer times' : `View all ${slots.length} times`}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </section>

      <BookingModal
        slot={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onConfirmBooking={async (slotId, notes) => {
          try {
            const response = await book.mutateAsync({ slotId, notes });
            return { success: true, appointment: response.appointment };
          } catch (error) {
            return { success: false, error };
          }
        }}
        onViewAppointments={onNavigateToAppointments}
      />
    </div>
  );
};