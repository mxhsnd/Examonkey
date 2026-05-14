"use client";

import { Badge } from "@/components/ui/badge";
import { useReferences, type ReferenceFile } from "@/lib/hooks/use-references";
import { useAppStore } from "@/lib/store";
import { BookOpen, FileText, Loader2, Check } from "lucide-react";

interface ReferencePickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  categoryFilter?: "knowledge" | "reference";
}

export function ReferencePicker({ selectedIds, onSelectionChange, categoryFilter }: ReferencePickerProps) {
  const { currentCourseId } = useAppStore();
  const { entries, loading } = useReferences(currentCourseId);

  const filtered = categoryFilter ? entries.filter((e) => e.category === categoryFilter) : entries;
  const knowledgeFiles = filtered.filter((e) => e.category === "knowledge");
  const referenceFiles = filtered.filter((e) => e.category === "reference");

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载参考文件...
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        暂无参考文件，请先在「参考文件」页面添加
      </p>
    );
  }

  function renderGroup(files: ReferenceFile[], label: string, icon: React.ReactNode) {
    if (files.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </div>
        {files.map((entry) => {
          const selected = selectedIds.includes(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => toggle(entry.id)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 w-full text-left transition-colors ${
                selected ? "bg-primary/10 border border-primary/30" : "hover:bg-accent border border-transparent"
              }`}
            >
              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                selected ? "bg-primary border-primary" : "border-input"
              }`}>
                {selected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <span className="text-sm truncate flex-1">{entry.title}</span>
              <Badge variant="secondary" className="text-xs shrink-0">
                {entry.mimeType === "text/markdown" ? "文本" : entry.mimeType.split("/")[1]?.toUpperCase()}
              </Badge>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!categoryFilter && renderGroup(knowledgeFiles, "知识文件", <BookOpen className="h-3 w-3" />)}
      {!categoryFilter && renderGroup(referenceFiles, "参考文件", <FileText className="h-3 w-3" />)}
      {categoryFilter === "knowledge" && renderGroup(knowledgeFiles, "知识文件", <BookOpen className="h-3 w-3" />)}
      {categoryFilter === "reference" && renderGroup(referenceFiles, "参考文件", <FileText className="h-3 w-3" />)}
      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">已选择 {selectedIds.length} 个文件</p>
      )}
    </div>
  );
}
