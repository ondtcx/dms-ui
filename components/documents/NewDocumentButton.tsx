"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewDocumentButtonProps {
  onClick: () => void;
  "aria-label"?: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Single creation entry point. The creation dialog owns the three modes
 * (editor, template, upload); this button only opens it.
 */
export function NewDocumentButton({
  onClick,
  "aria-label": ariaLabel,
  disabled = false,
  label = "Crear",
}: NewDocumentButtonProps) {
  return (
    <Button
      type="button"
      size="default"
      className="gap-2"
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      disabled={disabled}
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
