"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  MessageCircle,
  ClipboardList,
  Settings,
  Menu,
  GraduationCap,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CourseSelector } from "@/components/course-selector";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "课件总结", icon: BookOpen },
  { href: "/knowledge", label: "知识点", icon: Lightbulb },
  { href: "/exam-analysis", label: "真题分析", icon: FileText },
  { href: "/quiz", label: "模拟出题", icon: ClipboardList },
  { href: "/chat", label: "AI 答疑", icon: MessageCircle },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform duration-200 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">Examonkey</h1>
        </div>

        <div className="px-4 pt-4">
          <CourseSelector />
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) toggleSidebar();
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center">
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
