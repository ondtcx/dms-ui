"use client";

import React from "react";

import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  File,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ExistingDocument {
  id: string;
  title: string;
  type: string;
  category: string;
  createdAt: string;
  status: "draft" | "approved" | "pending";
  author: string;
}

interface DocumentListProps {
  documents: ExistingDocument[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDocumentClick?: (doc: ExistingDocument) => void;
}

const typeIcons: Record<string, typeof FileText> = {
  memo: FileText,
  report: FileSpreadsheet,
  contract: File,
  invoice: FileSpreadsheet,
  certificate: FileText,
  policy: FileText,
  procedure: FileText,
  other: File,
};

const statusConfig = {
  draft: { label: "Borrador", color: "bg-muted text-muted-foreground" },
  approved: { label: "Aprobado", color: "bg-accent/20 text-accent" },
  pending: { label: "Pendiente", color: "bg-warning/20 text-warning" },
};

const categoryLabels: Record<string, string> = {
  administrative: "Administrativo",
  financial: "Financiero",
  legal: "Legal",
  hr: "Recursos Humanos",
  operations: "Operaciones",
  it: "Tecnología",
  marketing: "Marketing",
  sales: "Ventas",
};

export function DocumentList({
  documents,
  selectedIds,
  onSelectionChange,
  onDocumentClick,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDocs.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredDocs.map((d) => d.id));
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar documentos..."
            className="bg-input pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full bg-input sm:w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection Header */}
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={
              filteredDocs.length > 0 &&
              selectedIds.length === filteredDocs.length
            }
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} seleccionado(s)`
              : `${filteredDocs.length} documento(s)`}
          </span>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-auto">
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              No se encontraron documentos
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredDocs.map((doc) => {
              const Icon = typeIcons[doc.type] || File;
              const status = statusConfig[doc.status];
              const isSelected = selectedIds.includes(doc.id);

              return (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/50",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleSelect(doc.id)}
                  />
                  <button
                    type="button"
                    onClick={() => onDocumentClick?.(doc)}
                    className="flex flex-1 items-center gap-4 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {doc.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{categoryLabels[doc.category]}</span>
                        <span>•</span>
                        <span>{doc.author}</span>
                        <span>•</span>
                        <span>
                          {new Date(doc.createdAt).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    </div>
                    <Badge className={cn("shrink-0", status.color)}>
                      {doc.status === "approved" ? (
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {status.label}
                    </Badge>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Duplicar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
