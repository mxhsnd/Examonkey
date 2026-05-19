"use client";

import { useEffect, useRef } from "react";
import { EditorSelection, EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { cn } from "@/lib/utils";

interface NoteMarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

type DecorationRange = {
  from: number;
  to: number;
  decoration: Decoration;
};

type RevealRegion = {
  from: number;
  to: number;
};

function selectionTouches(selection: EditorSelection, from: number, to: number) {
  return selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function selectionNear(selection: EditorSelection, from: number, to: number, padding = 1) {
  return selection.ranges.some((range) => range.from <= to + padding && range.to >= from - padding);
}

function selectionInside(selection: EditorSelection, from: number, to: number) {
  return selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function shouldRevealRegion(selection: EditorSelection, region: RevealRegion, padding = 0) {
  return selectionNear(selection, region.from, region.to, padding);
}

function addSortedRanges(builder: RangeSetBuilder<Decoration>, ranges: DecorationRange[]) {
  ranges
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .forEach((range) => {
      builder.add(range.from, range.to, range.decoration);
    });
}

function pushHiddenToken(
  ranges: DecorationRange[],
  selection: EditorSelection,
  from: number,
  to: number,
  revealRegion?: RevealRegion
) {
  if (from >= to) return;
  if (revealRegion ? shouldRevealRegion(selection, revealRegion) : selectionNear(selection, from, to)) return;

  ranges.push({
    from,
    to,
    decoration: Decoration.mark({ class: "cm-md-hidden-token" }),
  });
}

function pushTextStyle(ranges: DecorationRange[], from: number, to: number, className: string) {
  if (from >= to) return;

  ranges.push({
    from,
    to,
    decoration: Decoration.mark({ class: className }),
  });
}

function collectDecorations(docText: string, selection: EditorSelection) {
  const builder = new RangeSetBuilder<Decoration>();
  const lines = docText.split("\n");
  let offset = 0;
  let inFencedCode = false;

  for (const line of lines) {
    const lineStart = offset;
    const lineEnd = offset + line.length;
    const lineActive = selectionTouches(selection, lineStart, lineEnd);
    const ranges: DecorationRange[] = [];

    const fenceMatch = line.match(/^(```+|~~~+)(.*)$/);
    if (fenceMatch) {
      const markerLength = fenceMatch[1].length;
      const infoString = fenceMatch[2] ?? "";
      const revealRegion = { from: lineStart, to: lineEnd };
      pushHiddenToken(ranges, selection, lineStart, lineStart + markerLength, revealRegion);

      if (infoString.trim()) {
        const infoOffset = infoString.search(/\S/);
        if (infoOffset >= 0) {
          const infoStart = lineStart + markerLength + infoOffset;
          pushTextStyle(ranges, infoStart, lineEnd, "cm-md-code-info");
        }
      }

      inFencedCode = !inFencedCode;
      addSortedRanges(builder, ranges);
      offset = lineEnd + 1;
      continue;
    }

    if (inFencedCode) {
      pushTextStyle(ranges, lineStart, lineEnd, "cm-md-code-block");
      addSortedRanges(builder, ranges);
      offset = lineEnd + 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})(\s+)/);
    if (headingMatch) {
      const markerLength = headingMatch[1].length + headingMatch[2].length;
      const revealRegion = { from: lineStart, to: lineEnd };
      pushHiddenToken(ranges, selection, lineStart, lineStart + markerLength, revealRegion);
      pushTextStyle(ranges, lineStart + markerLength, lineEnd, "cm-md-heading");
    }

    const taskListMatch = line.match(/^(\s*(?:[-*+]\s|\d+[.)]\s))(\[(?: |x|X)\]\s)/);
    if (taskListMatch) {
      const markerLength = taskListMatch[1].length;
      const checkboxLength = taskListMatch[2].length;
      const revealRegion = { from: lineStart, to: lineStart + markerLength + checkboxLength };
      pushHiddenToken(ranges, selection, lineStart, lineStart + markerLength, revealRegion);
      pushTextStyle(
        ranges,
        lineStart + markerLength,
        lineStart + markerLength + checkboxLength - 1,
        "cm-md-task-marker"
      );
    } else {
      const listMatch = line.match(/^(\s*(?:[-*+]\s|\d+[.)]\s))/);
      if (listMatch) {
        const revealRegion = { from: lineStart, to: Math.min(lineEnd, lineStart + listMatch[1].length + 1) };
        pushHiddenToken(ranges, selection, lineStart, lineStart + listMatch[1].length, revealRegion);
      }
    }

    const quoteMatch = line.match(/^(\s*>\s?)/);
    if (quoteMatch) {
      const revealRegion = { from: lineStart, to: lineEnd };
      pushHiddenToken(ranges, selection, lineStart, lineStart + quoteMatch[1].length, revealRegion);
      pushTextStyle(ranges, lineStart + quoteMatch[1].length, lineEnd, "cm-md-blockquote");
    }

    if (/^(?:\|.*\|.*|[-:| ]{3,})\s*$/.test(line) && line.includes("|")) {
      pushTextStyle(ranges, lineStart, lineEnd, "cm-md-table-row");
      for (const match of line.matchAll(/\|/g)) {
        const pos = lineStart + (match.index ?? 0);
        pushHiddenToken(ranges, selection, pos, pos + 1, { from: lineStart, to: lineEnd });
      }
    }

    if (/^(?:\*\s?){3,}$|^(?:-\s?){3,}$|^(?:_\s?){3,}$/.test(line.trim())) {
      pushTextStyle(ranges, lineStart, lineEnd, "cm-md-hr");
    }

    for (const match of line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
      const start = lineStart + (match.index ?? 0);
      const altText = match[1];
      const url = match[2];
      const altStart = start + 2;
      const altEnd = altStart + altText.length;
      const urlStart = altEnd + 2;
      const urlEnd = urlStart + url.length;
      const revealRegion = { from: start, to: urlEnd + 1 };

      pushHiddenToken(ranges, selection, start, altStart, revealRegion);
      pushTextStyle(ranges, altStart, altEnd, "cm-md-image-alt");
      pushHiddenToken(ranges, selection, altEnd, urlStart, revealRegion);
      pushTextStyle(ranges, urlStart, urlEnd, "cm-md-link-url");
      pushHiddenToken(ranges, selection, urlEnd, urlEnd + 1, revealRegion);
    }

    for (const match of line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      const start = lineStart + (match.index ?? 0);
      const label = match[1];
      const url = match[2];
      const labelStart = start + 1;
      const labelEnd = labelStart + label.length;
      const urlStart = labelEnd + 2;
      const urlEnd = urlStart + url.length;
      const revealRegion = { from: start, to: urlEnd + 1 };

      pushHiddenToken(ranges, selection, start, labelStart, revealRegion);
      pushTextStyle(ranges, labelStart, labelEnd, "cm-md-link-label");
      pushHiddenToken(ranges, selection, labelEnd, urlStart, revealRegion);
      pushTextStyle(ranges, urlStart, urlEnd, "cm-md-link-url");
      pushHiddenToken(ranges, selection, urlEnd, urlEnd + 1, revealRegion);
    }

    for (const match of line.matchAll(/https?:\/\/[^\s)]+/g)) {
      const start = lineStart + (match.index ?? 0);
      pushTextStyle(ranges, start, start + match[0].length, "cm-md-link-label");
    }

    for (const match of line.matchAll(/~~(?=\S)(.+?\S)~~/g)) {
      const start = lineStart + (match.index ?? 0);
      const contentFrom = start + 2;
      const contentTo = contentFrom + match[1].length;
      const revealRegion = { from: start, to: contentTo + 2 };
      pushHiddenToken(ranges, selection, start, contentFrom, revealRegion);
      pushTextStyle(ranges, contentFrom, contentTo, "cm-md-strike");
      pushHiddenToken(ranges, selection, contentTo, contentTo + 2, revealRegion);
    }

    for (const match of line.matchAll(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g)) {
      const start = lineStart + (match.index ?? 0);
      const markerLength = match[1].length;
      const contentLength = match[2].length;
      const contentFrom = start + markerLength;
      const contentTo = contentFrom + contentLength;
      const revealRegion = { from: start, to: contentTo + markerLength };

      pushHiddenToken(ranges, selection, start, contentFrom, revealRegion);
      pushTextStyle(ranges, contentFrom, contentTo, "cm-md-strong");
      pushHiddenToken(ranges, selection, contentTo, contentTo + markerLength, revealRegion);
    }

    for (const match of line.matchAll(/(^|[^*])\*([^*\n]+)\*(?!\*)|(^|[^_])_([^_\n]+)_(?!_)/g)) {
      const index = match.index ?? 0;
      const token = match[0];
      const inner = match[2] ?? match[4];
      if (!inner) continue;

      const leftPad = token.startsWith("*") || token.startsWith("_") ? 0 : 1;
      const start = lineStart + index + leftPad;
      const contentFrom = start + 1;
      const contentTo = contentFrom + inner.length;
      const revealRegion = { from: start, to: contentTo + 1 };

      pushHiddenToken(ranges, selection, start, contentFrom, revealRegion);
      pushTextStyle(ranges, contentFrom, contentTo, "cm-md-emphasis");
      pushHiddenToken(ranges, selection, contentTo, contentTo + 1, revealRegion);
    }

    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
      const start = lineStart + (match.index ?? 0);
      const contentFrom = start + 1;
      const contentTo = contentFrom + match[1].length;
      const revealRegion = { from: start, to: contentTo + 1 };

      if (!lineActive && !selectionInside(selection, revealRegion.from, revealRegion.to)) {
        pushHiddenToken(ranges, selection, start, contentFrom, revealRegion);
        pushHiddenToken(ranges, selection, contentTo, contentTo + 1, revealRegion);
      }

      pushTextStyle(ranges, contentFrom, contentTo, "cm-md-inline-code");
    }

    addSortedRanges(builder, ranges);
    offset = lineEnd + 1;
  }

  return builder.finish();
}

const livePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return collectDecorations(state.doc.toString(), state.selection);
  },
  update(_value, tr) {
    if (tr.docChanged || tr.selection) {
      return collectDecorations(tr.state.doc.toString(), tr.state.selection);
    }
    return collectDecorations(tr.state.doc.toString(), tr.state.selection);
  },
  provide(field) {
    return EditorView.decorations.from(field);
  },
});

export function NoteMarkdownEditor({ content, onChange, className }: NoteMarkdownEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latestContentRef = useRef(content);

  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (!rootRef.current) return;

    const state = EditorState.create({
      doc: latestContentRef.current,
      extensions: [
        history(),
        markdown(),
        livePreviewField,
        lineNumbers(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
            backgroundColor: "transparent",
            color: "var(--foreground)",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "var(--font-sans)",
            lineHeight: "1.85",
            padding: "1.25rem 0 2.5rem",
          },
          ".cm-content": {
            minHeight: "100%",
            maxWidth: "760px",
            margin: "0 auto",
            padding: "0 1.5rem 4rem",
            caretColor: "var(--foreground)",
          },
          ".cm-line": {
            paddingLeft: "0.625rem",
            paddingRight: "0.625rem",
            marginBottom: "0.28rem",
            borderRadius: "0.5rem",
          },
          ".cm-focused": {
            outline: "none",
          },
          ".cm-editor.cm-focused": {
            outline: "none",
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            color: "var(--muted-foreground)",
            border: "none",
          },
          ".cm-lineNumbers .cm-gutterElement": {
            padding: "0 0.5rem 0 0",
          },
          ".cm-activeLine": {
            backgroundColor: "color-mix(in oklch, var(--accent) 14%, transparent)",
            borderRadius: "0.5rem",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "transparent",
          },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
            backgroundColor: "color-mix(in oklch, var(--accent) 36%, transparent)",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "var(--foreground)",
          },
          ".cm-md-hidden-token": {
            opacity: "0.08",
            color: "color-mix(in oklch, var(--muted-foreground) 82%, transparent)",
            fontSize: "0.92em",
            transition: "opacity 120ms ease, color 120ms ease",
          },
          ".cm-md-heading": {
            fontWeight: "700",
            letterSpacing: "-0.012em",
            lineHeight: "1.4",
          },
          ".cm-line:has(.cm-md-heading)": {
            marginTop: "1rem",
            marginBottom: "0.5rem",
          },
          ".cm-line:has(.cm-md-blockquote)": {
            marginTop: "0.5rem",
            marginBottom: "0.5rem",
            paddingLeft: "0.95rem",
            borderLeft: "3px solid color-mix(in oklch, var(--border) 88%, transparent)",
          },
          ".cm-line:has(.cm-md-code-block)": {
            marginTop: "0.35rem",
            marginBottom: "0.35rem",
          },
          ".cm-line:has(.cm-md-table-row)": {
            marginTop: "0.2rem",
            marginBottom: "0.2rem",
          },

          ".cm-md-emphasis": {
            fontStyle: "italic",
          },
          ".cm-md-strike": {
            textDecoration: "line-through",
            textDecorationColor: "color-mix(in oklch, var(--muted-foreground) 70%, transparent)",
          },
          ".cm-md-inline-code": {
            fontFamily: "var(--font-mono)",
            backgroundColor: "color-mix(in oklch, var(--muted) 88%, transparent)",
            borderRadius: "0.35rem",
            padding: "0.08rem 0.28rem",
          },
          ".cm-md-code-block": {
            fontFamily: "var(--font-mono)",
            backgroundColor: "color-mix(in oklch, var(--muted) 65%, transparent)",
            color: "color-mix(in oklch, var(--foreground) 88%, var(--muted-foreground))",
          },
          ".cm-md-code-info": {
            color: "var(--muted-foreground)",
            fontSize: "0.82em",
            letterSpacing: "0.02em",
            textTransform: "lowercase",
          },
          ".cm-md-link-label": {
            color: "color-mix(in oklch, var(--primary) 82%, var(--foreground))",
            textDecoration: "underline",
            textDecorationColor: "color-mix(in oklch, var(--primary) 45%, transparent)",
            textUnderlineOffset: "2px",
          },
          ".cm-md-link-url": {
            color: "var(--muted-foreground)",
            fontSize: "0.9em",
          },
          ".cm-md-image-alt": {
            color: "color-mix(in oklch, var(--foreground) 80%, var(--muted-foreground))",
            fontStyle: "italic",
          },
          ".cm-md-task-marker": {
            color: "color-mix(in oklch, var(--primary) 70%, var(--foreground))",
            fontFamily: "var(--font-mono)",
          },
          ".cm-md-blockquote": {
            color: "color-mix(in oklch, var(--foreground) 70%, var(--muted-foreground))",
            fontStyle: "italic",
          },
          ".cm-md-table-row": {
            fontFamily: "var(--font-mono)",
            color: "color-mix(in oklch, var(--foreground) 90%, var(--muted-foreground))",
          },
          ".cm-md-hr": {
            color: "var(--muted-foreground)",
            opacity: "0.65",
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: rootRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [onChange]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current === content) return;

    view.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: content,
      },
    });
  }, [content]);

  return <div ref={rootRef} className={cn("h-full min-h-0", className)} />;
}
