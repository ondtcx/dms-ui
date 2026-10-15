"use client";

import type { ReactNode } from "react";
import { DirectoryNavigation } from "./DirectoryNavigation";

interface FolderBrowserProps {
  directoryId: number | null;
  onNavigate: (id: number | null) => void;
  children?: ReactNode;
  enabled?: boolean;
}

export function FolderBrowser({ directoryId, onNavigate, children, enabled = true }: FolderBrowserProps) {
  if (!enabled) return <>{children}</>;
  return (
    <section aria-label="Contenido de la carpeta" className="space-y-4">
      <DirectoryNavigation key={directoryId ?? "root"} value={directoryId} onChange={onNavigate} />
      {children}
    </section>
  );
}
