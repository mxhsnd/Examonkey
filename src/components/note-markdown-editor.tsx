"use client";

import { useEffect, useRef } from "react";
import { EditorSelection, EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
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

function selectionTouches(selection: EditorSelection, from: number, to: number) {
  return selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function selectionNear(selection: EditorSelection, from: number, to: number, padding = 1) {
  return selection.ranges.some((range) => range.from <= to + padding && range.to >= from - padding);
}

function addSortedRanges(builder: RangeSetBuilder<Decoration>, ranges: DecorationRange[]) {
  ranges
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .forEach((range) => {
      builder.add(range.from, range.to, range.decoration);
    });
}

function pushHiddenToken(ranges: DecorationRange[], selection: EditorSelection, from: number, to: number) {
  if (from >= to || selectionNear(selection, from, to)) return;

  ranges.push({
    from,
    to,
    decoration: Decoration.mark({ class: "cm-md-hidden-token" }),
  });
}

function collectDecorations(docText: string, selection: EditorSelection) {
  const builder = new RangeSetBuilder<Decoration>();
  const lines = docText.split("\n");
  let offset = 0;

  for (const line of lines) {
    const lineStart = offset;
    const lineEnd = offset + line.length;
    const lineActive = selectionTouches(selection, lineStart, lineEnd);
    const ranges: DecorationRange[] = [];

    const headingMatch = line.match(/^(#{1,6})(\s+)/);
    if (headingMatch) {
      const markerLength = headingMatch[1].length + headingMatch[2].length;
      pushHiddenToken(ranges, selection, lineStart, lineStart + markerLength);
    }

    const listMatch = line.match(/^(	*\s*(?:[-*+]\s|\d+[.)]\s))/);
    if (listMatch) {
      pushHiddenToken(ranges, selection, lineStart, lineStart + listMatch[1].length);
    }

    const quoteMatch = line.match(/^(	*\s*>\s?)/);
    if (quoteMatch) {
      pushHiddenToken(ranges, selection, lineStart, lineStart + quoteMatch[1].length);
    }

    for (const match of line.matchAll(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g)) {
      const start = lineStart + (match.index ?? 0);
      const markerLength = match[1].length;
      const contentLength = match[2].length;
      const contentFrom = start + markerLength;
      const contentTo = contentFrom + contentLength;

      pushHiddenToken(ranges, selection, start, contentFrom);
      ranges.push({
        from: contentFrom,
        to: contentTo,
        decoration: Decoration.mark({ class: "cm-md-strong" }),
      });
      pushHiddenToken(ranges, selection, contentTo, contentTo + markerLength);
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

      pushHiddenToken(ranges, selection, start, contentFrom);
      ranges.push({
        from: contentFrom,
        to: contentTo,
        decoration: Decoration.mark({ class: "cm-md-emphasis" }),
      });
      pushHiddenToken(ranges, selection, contentTo, contentTo + 1);
    }

    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
      const start = lineStart + (match.index ?? 0);
      const contentFrom = start + 1;
      const contentTo = contentFrom + match[1].length;

      if (!lineActive) {
        pushHiddenToken(ranges, selection, start, contentFrom);
        pushHiddenToken(ranges, selection, contentTo, contentTo + 1);
      }

      ranges.push({
        from: contentFrom,
        to: contentTo,
        decoration: Decoration.mark({ class: "cm-md-inline-code" }),
      });
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
            lineHeight: "1.75",
            padding: "0.75rem 0",
          },
          ".cm-content": {
            minHeight: "100%",
            padding: "0 1rem 3rem",
            caretColor: "var(--foreground)",
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
            backgroundColor: "color-mix(in oklch, var(--accent) 25%, transparent)",
            borderRadius: "0.375rem",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "transparent",
          },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
            backgroundColor: "color-mix(in oklch, var(--accent) 50%, transparent)",
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "var(--foreground)",
          },
          ".cm-md-hidden-token": {
            opacity: "0.16",
            fontSize: "0.92em",
            transition: "opacity 120ms ease",
          },
          ".cm-md-strong": {
            fontWeight: "700",
          },
          ".cm-md-emphasis": {
            fontStyle: "italic",
          },
          ".cm-md-inline-code": {
            fontFamily: "var(--font-mono)",
            backgroundColor: "var(--muted)",
            borderRadius: "0.25rem",
            padding: "0.1rem 0.25rem",
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
