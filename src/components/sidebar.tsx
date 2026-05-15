"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  BookOpen,
  FolderOpen,
  NotebookPen,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CourseSelector } from "@/components/course-selector";

const navItems = [
  { href: "/", label: "Learning", icon: BookOpen },
  { href: "/notebook", label: "笔记本", icon: NotebookPen },
  { href: "/references", label: "参考文件", icon: FolderOpen },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 border-r bg-card transition-all duration-200 flex flex-col",
        sidebarOpen ? "w-56" : "w-14"
      )}
    >
      <div className="flex items-center gap-1 px-2 h-11 border-b shrink-0">
        {sidebarOpen && (
          <div className="flex-1 min-w-0">
            <CourseSelector compact />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={!sidebarOpen ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                !sidebarOpen && "justify-center px-0",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
