import React, { useEffect, useState } from 'react';
import { SidebarTrigger } from './ui/sidebar';
import { Button } from './ui/button';
import { Moon, Sun, Bell, Search, Command } from 'lucide-react';

export default function Header({ currentPage }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark((prev) => !prev);
  };

  return (
    <header className="flex h-14 items-center justify-between px-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors" />
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{currentPage}</h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 mr-4 group cursor-pointer">
           <Command size={12} className="text-zinc-400" />
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Search Console</span>
           <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 ml-4 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors italic">⌘K</span>
        </div>

        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 rounded-xl active:scale-[0.97]">
           <Bell size={18} />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleDark} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 rounded-xl active:scale-[0.97]">
          {isDark ? (
            <Sun className="w-[18px] h-[18px] text-amber-500" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
        </Button>
      </div>
    </header>
  );
}
