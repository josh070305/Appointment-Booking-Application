import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { AuthProvider } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { BrowseSlotsPage } from './pages/BrowseSlotsPage.js';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage.js';
import { AuthModal } from './components/AuthModal.js';
import { ConcurrencySimulator } from './components/ConcurrencySimulator.js';
import { initSocketClient } from './services/socket.js';
import { api } from './services/api.js';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5_000 } } });

export const AppContent: React.FC = () => {
  const [tab, setTab] = useState<'browse' | 'my-appointments'>('browse');
  const [authOpen, setAuthOpen] = useState(false);
  const [concurrencyOpen, setConcurrencyOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);

  // Fetch CSRF token on mount so state-changing requests can include it
  useEffect(() => {
    api.fetchCsrfToken().then(() => {
      // CSRF token is now cached and will be included in X-XSRF-Token headers
    });
  }, []);

  useEffect(() => {
    initSocketClient(queryClient);
  }, []);

  const handleOpenConcurrency = async () => {
    try {
      const res = await api.getSlots({ status: 'AVAILABLE' });
      setAvailableSlots(res.slots || []);
    } catch {
      // ignore
    }
    setConcurrencyOpen(true);
  };

  const handleRefreshSlots = async () => {
    try {
      const res = await api.getSlots({ status: 'AVAILABLE' });
      setAvailableSlots(res.slots || []);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar 
        currentTab={tab} 
        onSelectTab={setTab} 
        onOpenConcurrencyDemo={handleOpenConcurrency} 
        onOpenAuthModal={() => setAuthOpen(true)} 
      />
      <main className="flex-1">
        {tab === 'browse' ? (
          <BrowseSlotsPage onNavigateToAppointments={() => setTab('my-appointments')} />
        ) : (
          <MyAppointmentsPage onNavigateToBrowse={() => setTab('browse')} />
        )}
      </main>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <ConcurrencySimulator 
        isOpen={concurrencyOpen} 
        onClose={() => setConcurrencyOpen(false)} 
        availableSlots={availableSlots} 
        onRefreshSlots={handleRefreshSlots} 
      />
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 dark:text-slate-400">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <strong>AcuSlot</strong> · Secure, real-time appointment booking with zero double-bookings
          </span>
          <span className="flex items-center gap-2">
            <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Socket.io real-time engine active
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() { return <QueryClientProvider client={queryClient}><AuthProvider><AppContent /></AuthProvider></QueryClientProvider>; }
