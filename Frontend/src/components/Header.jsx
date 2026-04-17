import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header({ currentPage }) {
  return (
    <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-xl text-foreground">{currentPage}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search medicines, customers... (⌘K)"
            className="w-full bg-muted pl-10 pr-4 py-2 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <Button variant="ghost" size="icon" className="rounded-xl">
          <Bell className="w-5 h-5" />
        </Button>

        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl" />
      </div>
    </header>
  );
}