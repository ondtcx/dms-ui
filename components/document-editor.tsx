"use client";

import { useRef } from "react";
import { Bold, Italic, List, ListOrdered, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentEditorProps {
  title: string;
  content: string;
  onContentChange: (content: string) => void;
  isSaving?: boolean;
  onSave?: () => void;
}

type MarkdownAction = "bold" | "italic" | "unordered-list" | "ordered-list";

const markdownActions: Record<MarkdownAction, { prefix: string; suffix: string }> = {
  bold: { prefix: "**", suffix: "**" },
  italic: { prefix: "*", suffix: "*" },
  "unordered-list": { prefix: "- ", suffix: "" },
  "ordered-list": { prefix: "1. ", suffix: "" },
};

export function applyMarkdownToSelection(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  action: MarkdownAction,
): string {
  const selectedText = content.slice(selectionStart, selectionEnd);
  const { prefix, suffix } = markdownActions[action];
  const replacement = `${prefix}${selectedText || "texto"}${suffix}`;
  return `${content.slice(0, selectionStart)}${replacement}${content.slice(selectionEnd)}`;
}

export function DocumentEditor({
  title,
  content,
  onContentChange,
  isSaving = false,
  onSave,
}: DocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const applyMarkdown = (action: MarkdownAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = selectionRef.current.start;
    const selectionEnd = selectionRef.current.end;
    const selectedText = content.slice(selectionStart, selectionEnd) || "texto";
    const nextContent = applyMarkdownToSelection(content, selectionStart, selectionEnd, action);
    onContentChange(nextContent);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextStart = selectionStart + markdownActions[action].prefix.length;
      textarea.setSelectionRange(nextStart, nextStart + selectedText.length);
    });
  };

  const preserveSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  };

  const actions = [
    { action: "bold" as const, label: "Negrita", icon: Bold },
    { action: "italic" as const, label: "Cursiva", icon: Italic },
    { action: "unordered-list" as const, label: "Lista", icon: List },
    { action: "ordered-list" as const, label: "Lista numerada", icon: ListOrdered },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="truncate text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-1 border-b border-border bg-secondary/30 p-2">
        {actions.map(({ action, label, icon: Icon }) => (
          <Button
            key={action}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => applyMarkdown(action)}
            onMouseDown={(event) => {
              preserveSelection();
              event.preventDefault();
            }}
            title={label}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        {onSave && (
          <Button
            type="button"
            className="ml-auto gap-2"
            onClick={onSave}
            disabled={isSaving}
            aria-label={isSaving ? "Guardando..." : "Guardar"}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 p-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          onSelect={(event) => {
            selectionRef.current = {
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            };
          }}
          placeholder="Escribe el contenido del documento aquí..."
          className="min-h-[400px] flex-1 resize-none bg-transparent font-mono text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Contenido del documento"
        />
      </div>
    </div>
  );
}
