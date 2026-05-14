"use client";

import { useState } from "react";
import { useCourses } from "@/lib/hooks/use-courses";
import { useAppStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Plus, Pencil, Trash2, BookMarked } from "lucide-react";
import { toast } from "sonner";

export function CourseSelector() {
  const { courses, addCourse, renameCourse, deleteCourse } = useCourses();
  const { currentCourseId, setCurrentCourse } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState("");

  const currentCourse = courses?.find((c) => c.id === currentCourseId);

  function openCreate() {
    setDialogMode("create");
    setNameInput("");
    setTimeout(() => setDialogOpen(true), 50);
  }

  function openRename(id: number, name: string) {
    setDialogMode("rename");
    setEditingId(id);
    setNameInput(name);
    setTimeout(() => setDialogOpen(true), 50);
  }

  async function handleSubmit() {
    const name = nameInput.trim();
    if (!name) return;

    if (dialogMode === "create") {
      const id = await addCourse(name);
      setCurrentCourse(id);
      toast.success(`已创建课程「${name}」`);
    } else if (editingId) {
      await renameCourse(editingId, name);
      toast.success("已重命名");
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`确定删除课程「${name}」？所有相关数据将被清除。`)) return;
    await deleteCourse(id);
    if (currentCourseId === id) setCurrentCourse(null);
    toast.success("已删除");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-all"
        >
          <BookMarked className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left">
            {currentCourse?.name || "选择课程"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={4}>
          {courses?.map((course) => (
            <DropdownMenuItem
              key={course.id}
              className="group justify-between"
              onClick={() => setCurrentCourse(course.id!)}
            >
              <span className="truncate">{course.name}</span>
              <span className="hidden gap-1 group-focus:flex">
                <button
                  className="rounded p-0.5 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRename(course.id!, course.name);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  className="rounded p-0.5 hover:bg-background text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(course.id!, course.name);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </DropdownMenuItem>
          ))}
          {courses && courses.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={openCreate} closeOnClick={false}>
            <Plus className="h-4 w-4" />
            新建课程
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "新建课程" : "重命名课程"}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="课程名称，如：高等数学"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!nameInput.trim()}>
              {dialogMode === "create" ? "创建" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
