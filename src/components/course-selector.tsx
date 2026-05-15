"use client";

import { useState, useRef, useEffect } from "react";
import { useCourses } from "@/lib/hooks/use-courses";
import { useAppStore } from "@/lib/store";
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
  const { currentCourseId, setCurrentCourseId } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "rename">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const currentCourse = courses?.find((c) => c.id === currentCourseId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  function openCreate() {
    setMenuOpen(false);
    setDialogMode("create");
    setNameInput("");
    setTimeout(() => setDialogOpen(true), 50);
  }

  function openRename(id: string, name: string) {
    setMenuOpen(false);
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
      setCurrentCourseId(id);
      toast.success(`已创建课程「${name}」`);
    } else if (editingId) {
      await renameCourse(editingId, name);
      toast.success("已重命名");
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除课程「${name}」？所有相关数据将被清除。`)) return;
    await deleteCourse(id);
    if (currentCourseId === id) setCurrentCourseId(null);
    toast.success("已删除");
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-all"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <BookMarked className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-left">
            {currentCourse?.name || "选择课程"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover p-1 shadow-md">
            {courses?.map((course) => (
              <div
                key={course.id}
                className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                onClick={() => {
                  setCurrentCourseId(course.id);
                  setMenuOpen(false);
                }}
              >
                <span className="truncate">{course.name}</span>
                <span className="hidden gap-1 group-hover:flex">
                  <button
                    className="rounded p-0.5 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRename(course.id, course.name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded p-0.5 hover:bg-background text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(course.id, course.name);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </div>
            ))}
            {courses && courses.length > 0 && (
              <div className="-mx-1 my-1 h-px bg-border" />
            )}
            <div
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              新建课程
            </div>
          </div>
        )}
      </div>

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
