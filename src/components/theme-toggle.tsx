"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-20 w-8" />;

  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border p-0.5 bg-background/80 backdrop-blur-sm">
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => setTheme("light")}
        aria-label="浅色模式"
      >
        <Sun className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => setTheme("system")}
        aria-label="跟随系统"
      >
        <Monitor className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => setTheme("dark")}
        aria-label="深色模式"
      >
        <Moon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
