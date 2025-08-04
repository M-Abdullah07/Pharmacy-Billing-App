import React, { useEffect, useState } from "react";
import { SidebarTrigger } from "./ui/sidebar";
import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";

export default function Header({currentPage}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark((prev) => !prev);
  };

  return (
    <header className="flex justify-between items-center py-2 pr-2 border-b">
      <SidebarTrigger />
      <span>{currentPage}</span>
      <Button variant="ghost" size="icon" onClick={toggleDark}>
        {isDark ? (
          <Sun className="w-6 h-6 text-yellow-400 transition-colors" />
        ) : (
          <Moon className="w-6 h-6 text-gray-800 transition-colors dark:text-white" />
        )}
      </Button>
    </header>
  );
}
