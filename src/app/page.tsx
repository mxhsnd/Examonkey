"use client";

import { useAppStore } from "@/lib/store";
import { CourseGuard } from "@/components/course-guard";
import { ReferencesPanel } from "@/components/panels/references-panel";
import {
  NotebookEditorPanel,
  NotebookSelectorPanel,
} from "@/components/panels/notebook-panel";
import { MonkeyChatPanel } from "@/components/panels/monkey-chat-panel";
import { cn } from "@/lib/utils";

export default function LearningPage() {
  const { currentCourseId, sidebarOpen } = useAppStore();

  return (
    <CourseGuard>
      <div
        className={cn(
          "fixed inset-0 transition-all duration-200",
          sidebarOpen ? "left-56" : "left-14"
        )}
      >
        <div className="grid h-full grid-cols-3 grid-rows-3 gap-px bg-border p-px">
          <div className="min-h-0 min-w-0 overflow-hidden rounded-sm bg-background">
            <ReferencesPanel courseId={currentCourseId!} />
          </div>

          <div className="min-h-0 min-w-0 overflow-hidden rounded-sm bg-background">
            <NotebookSelectorPanel courseId={currentCourseId!} />
          </div>

          <div className="row-span-3 min-h-0 min-w-0 overflow-hidden rounded-sm bg-background">
            <MonkeyChatPanel panelId="chat1" courseId={currentCourseId!} />
          </div>

          <div className="col-span-2 row-span-2 min-h-0 min-w-0 overflow-hidden rounded-sm bg-background">
            <NotebookEditorPanel courseId={currentCourseId!} />
          </div>
        </div>
      </div>
    </CourseGuard>
  );
}
