"use client";

import { useAppStore } from "@/lib/store";
import { CourseGuard } from "@/components/course-guard";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { NotebookPanel } from "@/components/panels/notebook-panel";
import { ReferencesPanel } from "@/components/panels/references-panel";
import { MonkeyChatPanel } from "@/components/panels/monkey-chat-panel";
import { cn } from "@/lib/utils";

export default function LearningPage() {
  const { currentCourseId, sidebarOpen } = useAppStore();

  return (
    <CourseGuard>
      <div className={cn("fixed inset-0 transition-all duration-200", sidebarOpen ? "left-56" : "left-14")}>
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={33} minSize={20}>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize={50} minSize={20}>
                <ReferencesPanel courseId={currentCourseId!} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                <NotebookPanel courseId={currentCourseId!} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={67} minSize={40}>
            <MonkeyChatPanel panelId="chat1" courseId={currentCourseId!} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </CourseGuard>
  );
}
