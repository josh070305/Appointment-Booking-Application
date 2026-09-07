import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ClipboardList, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface NavbarProps {
  currentTab: 'browse' | 'my-appointments';
  onSelectTab: (tab: 'browse' | 'my-appointments') => void;
  onOpenConcurrencyDemo: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenConcurrencyDemo, onOpenAuthModal }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem('theme') === 'dark';
    setDark(enabled);
    document.documentElement.classList.toggle('dark', enabled);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <button onClick={() => onSelectTab('browse')} className="flex items-center gap-2.5 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><CalendarDays className="h-4 w-4" /></span>
          <span><span className="block text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">AcuSlot</span><span className="hidden text-[10px] font-medium text-slate-500 sm:block">Appointments made simple</span></span>
        </button>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900 sm:flex">
          {[["browse", "Find a time", CalendarDays], ["my-appointments", "My appointments", ClipboardList]].map(([id, label, Icon]) => (
            <button key={id as string} onClick={() => onSelectTab(id as 'browse' | 'my-appointments')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${currentTab === id ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}>
              <Icon className="h-3.5 w-3.5" />{label as string}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenConcurrencyDemo}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
            title="Simulate high-concurrency race condition (Alice vs Bob)"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="hidden md:inline">⚡ Live Race Test</span>
            <span className="md:hidden">⚡ Test</span>
          </button>
          <button onClick={toggleTheme} aria-label="Toggle color theme" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          {user ? <div className="relative"><button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1 pr-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{user.name.slice(0, 1).toUpperCase()}</span><span className="hidden sm:block">{user.name.split(' ')[0]}</span><ChevronDown className="h-3.5 w-3.5" /></button>{menuOpen && <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-2 py-2 text-xs dark:border-slate-800"><p className="font-semibold text-slate-900 dark:text-white">{user.name}</p><p className="truncate text-slate-500">{user.email}</p></div><button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="h-3.5 w-3.5" />Sign out</button></div>}</div> : <button onClick={onOpenAuthModal} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-500">Sign in</button>}
        </div>
      </div>
    </header>
  );
};
