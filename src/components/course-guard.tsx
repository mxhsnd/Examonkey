"use client";

import { useAppStore } from "@/lib/store";
import { BookMarked } from "lucide-react";

export function CourseGuard({ children }: { children: React.ReactNode }) {
  const { currentCourseId } = useAppStore();

  if (!currentCourseId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <BookMarked className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">请先选择课程</h3>
          <p className="text-sm text-muted-foreground mt-1">
            在左侧边栏选择或创建一个课程后开始使用
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
