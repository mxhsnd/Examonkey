"use client";

import { CourseGuard } from "@/components/course-guard";
import { NotebookEditorPanel, NotebookSelectorPanel, useNotebookState } from "@/components/panels/notebook-panel";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function NotebookPage() {
  const { currentCourseId, sidebarOpen } = useAppStore();
  const notebookState = useNotebookState(currentCourseId!);

  return (
    <CourseGuard>
      <div
        className={cn(
          "fixed inset-0 flex transition-all duration-200",
          sidebarOpen ? "left-56" : "left-14"
        )}
      >
        <div className="w-64 shrink-0 border-r bg-background">
          <NotebookSelectorPanel state={notebookState} />
        </div>

        <div className="flex-1 min-w-0 bg-background">
          <NotebookEditorPanel state={notebookState} />
        </div>
      </div>
    </CourseGuard>
  );
}
