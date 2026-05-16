"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

function splitIntoBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split("\n");
  let current: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        current.push(line);
        blocks.push(current.join("\n"));
        current = [];
        inCodeBlock = false;
      } else {
        if (current.length > 0) {
          blocks.push(current.join("\n"));
          current = [];
        }
        current.push(line);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      current.push(line);
      continue;
    }

    // Heading starts a new block
    if (/^#{1,6}\s/.test(line)) {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
        current = [];
      }
      blocks.push(line);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
        current = [];
      }
      blocks.push(line);
      continue;
    }

    // Empty line separates blocks
    if (line.trim() === "") {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  if (blocks.length === 0) {
    blocks.push("");
  }

  return blocks;
}

function BlockRenderer({
  block,
  isActive,
  onFocus,
  onBlur,
  onChange,
  compact,
}: {
  block: string;
  isActive: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
      adjustHeight(textareaRef.current);
    }
  }, [isActive]);

  function adjustHeight(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  if (isActive) {
    return (
      <textarea
        ref={textareaRef}
        value={block}
        onChange={(e) => {
          onChange(e.target.value);
          adjustHeight(e.target);
        }}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "w-full resize-none border rounded-md bg-muted/50 px-3 py-2 font-mono outline-none focus:ring-1 focus:ring-ring",
          compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"
        )}
        style={{ minHeight: "2em" }}
      />
    );
  }

  return (
    <div
      onClick={onFocus}
      className={cn(
        "cursor-text rounded-md px-1 -mx-1 transition-colors hover:bg-accent/30",
        compact
          ? "prose max-w-none text-sm [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p]:text-sm [&_li]:text-sm [&_code]:text-xs [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5"
          : "prose max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {block || " "}
      </ReactMarkdown>
    </div>
  );
}

export function BlockEditor({ content, onChange, className }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<string[]>(() => splitIntoBlocks(content));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const contentRef = useRef(content);

  // Sync blocks when content changes externally
  useEffect(() => {
    if (content !== contentRef.current && activeIndex === null) {
      setBlocks(splitIntoBlocks(content));
      contentRef.current = content;
    }
  }, [content, activeIndex]);

  const emitChange = useCallback(
    (newBlocks: string[]) => {
      const joined = newBlocks.join("\n\n");
      contentRef.current = joined;
      onChange(joined);
    },
    [onChange]
  );

  function handleBlockChange(index: number, value: string) {
    const newBlocks = [...blocks];
    newBlocks[index] = value;
    setBlocks(newBlocks);
    emitChange(newBlocks);
  }

  function handleBlur(index: number) {
    // Re-split in case user added blank lines or new blocks
    const joined = blocks.join("\n\n");
    const newBlocks = splitIntoBlocks(joined);
    setBlocks(newBlocks);
    setActiveIndex(null);
    contentRef.current = joined;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {blocks.map((block, i) => (
        <BlockRenderer
          key={i}
          block={block}
          isActive={activeIndex === i}
          onFocus={() => setActiveIndex(i)}
          onBlur={() => handleBlur(i)}
          onChange={(value) => handleBlockChange(i, value)}
          compact={className?.includes("compact")}
        />
      ))}
    </div>
  );
}
