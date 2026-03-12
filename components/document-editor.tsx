"use client";

import { useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  ImageIcon,
  Undo,
  Redo,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DocumentEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
}

const fontSizes = [
  { value: "12", label: "12px" },
  { value: "14", label: "14px" },
  { value: "16", label: "16px" },
  { value: "18", label: "18px" },
  { value: "20", label: "20px" },
  { value: "24", label: "24px" },
  { value: "28", label: "28px" },
  { value: "32", label: "32px" },
];

export function DocumentEditor({
  title,
  onTitleChange,
  content,
  onContentChange,
}: DocumentEditorProps) {
  const [fontSize, setFontSize] = useState("16");
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  const toggleFormat = useCallback((format: string) => {
    setActiveFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format],
    );
  }, []);

  const isFormatActive = (format: string) => activeFormats.includes(format);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Title Input */}
      <div className="border-b border-border p-4">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Título del documento..."
          className="border-0 bg-transparent text-xl font-semibold text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-secondary/30 p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {}}
          title="Deshacer"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {}}
          title="Rehacer"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Select value={fontSize} onValueChange={setFontSize}>
          <SelectTrigger className="h-8 w-20 bg-transparent">
            <Type className="mr-1 h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", isFormatActive("bold") && "bg-secondary")}
          onClick={() => toggleFormat("bold")}
          title="Negrita"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", isFormatActive("italic") && "bg-secondary")}
          onClick={() => toggleFormat("italic")}
          title="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            isFormatActive("underline") && "bg-secondary",
          )}
          onClick={() => toggleFormat("underline")}
          title="Subrayado"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            isFormatActive("align-left") && "bg-secondary",
          )}
          onClick={() => toggleFormat("align-left")}
          title="Alinear izquierda"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            isFormatActive("align-center") && "bg-secondary",
          )}
          onClick={() => toggleFormat("align-center")}
          title="Centrar"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            isFormatActive("align-right") && "bg-secondary",
          )}
          onClick={() => toggleFormat("align-right")}
          title="Alinear derecha"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => toggleFormat("list")}
          title="Lista"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => toggleFormat("list-ordered")}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {}}
          title="Insertar enlace"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {}}
          title="Insertar imagen"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-6">
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Escribe el contenido del documento aquí..."
          className={cn(
            "h-full min-h-[400px] w-full resize-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
            `text-[${fontSize}px]`,
            isFormatActive("bold") && "font-bold",
            isFormatActive("italic") && "italic",
            isFormatActive("underline") && "underline",
            isFormatActive("align-center") && "text-center",
            isFormatActive("align-right") && "text-right",
          )}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
        />
      </div>
    </div>
  );
}
