"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Filter, FolderOpen, Search } from "lucide-react";

import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Category,
  DocumentModalityFilter,
  DocumentType,
  PilotDocumentStatus,
} from "@/lib/types";

interface SectionOption {
  id: number;
  name: string;
}

interface DocumentsToolbarProps {
  initialSearch: string;
  categoryFilter?: number;
  documentTypeFilter?: number;
  sectionFilter?: number;
  statusFilter?: PilotDocumentStatus;
  modalityFilter?: DocumentModalityFilter;
  dateFrom?: string;
  dateTo?: string;
  categories?: Category[];
  documentTypes?: DocumentType[];
  sections?: SectionOption[];
  loadingCategories: boolean;
  loadingDocumentTypes: boolean;
  loadingSections: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: number | undefined) => void;
  onDocumentTypeChange: (value: number | undefined) => void;
  onSectionChange: (value: number | undefined) => void;
  onStatusChange: (value: PilotDocumentStatus | undefined) => void;
  onModalityChange: (value: DocumentModalityFilter | undefined) => void;
  onDateFromChange: (value: string | undefined) => void;
  onDateToChange: (value: string | undefined) => void;
  onUploadSingle: () => void;
  onUploadMultiple: () => void;
}

export function DocumentsToolbar({
  initialSearch,
  categoryFilter,
  documentTypeFilter,
  sectionFilter,
  statusFilter,
  modalityFilter,
  dateFrom,
  dateTo,
  categories,
  documentTypes,
  sections,
  loadingCategories,
  loadingDocumentTypes,
  loadingSections,
  onSearchChange,
  onCategoryChange,
  onDocumentTypeChange,
  onSectionChange,
  onStatusChange,
  onModalityChange,
  onDateFromChange,
  onDateToChange,
  onUploadSingle,
  onUploadMultiple,
}: DocumentsToolbarProps) {
  const [searchInput, setSearchInput] = useState(initialSearch);

  useEffect(() => {
    setSearchInput(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = searchInput.trim();
      onSearchChange(normalized);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput, onSearchChange]);

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder="Buscar por título, código o palabras clave..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={sectionFilter?.toString() || "all"}
          onValueChange={(value) => {
            onSectionChange(value === "all" ? undefined : parseInt(value));
            onCategoryChange(undefined);
            onDocumentTypeChange(undefined);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <FolderOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {!loadingSections &&
              sections?.map((section) => (
                <SelectItem key={section.id} value={section.id.toString()}>
                  {section.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter?.toString() || "all"}
          onValueChange={(value) => {
            onCategoryChange(value === "all" ? undefined : parseInt(value));
            onDocumentTypeChange(undefined);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {!loadingCategories &&
              categories
                ?.filter(
                  (cat) => cat.isActive && (sectionFilter === undefined || cat.sectionId === sectionFilter),
                )
                .map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>

        <Select
          value={documentTypeFilter?.toString() || "all"}
          onValueChange={(value) =>
            onDocumentTypeChange(value === "all" ? undefined : parseInt(value))
          }
        >
          <SelectTrigger className="w-full lg:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Subtipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los subtipos</SelectItem>
            {!loadingDocumentTypes &&
              documentTypes?.map((documentType) => (
                <SelectItem key={documentType.id} value={documentType.id.toString()}>
                  {documentType.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) =>
              onStatusChange(value === "all" ? undefined : (value as PilotDocumentStatus))
            }
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="REGISTRADO">Registrado</SelectItem>
              <SelectItem value="EN_REVISION">En revisión</SelectItem>
              <SelectItem value="ARCHIVADO">Archivado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={modalityFilter || "all"}
            onValueChange={(value) =>
              onModalityChange(value === "all" ? undefined : (value as DocumentModalityFilter))
            }
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Modalidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las modalidades</SelectItem>
              <SelectItem value="PHYSICAL">Físico</SelectItem>
              <SelectItem value="DIGITAL">Digital</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full lg:w-[170px]">
              <CalendarRange className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom || ""}
                onChange={(e) => onDateFromChange(e.target.value || undefined)}
                className="pl-10"
              />
            </div>
            <div className="relative w-full lg:w-[170px]">
              <CalendarRange className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo || ""}
                onChange={(e) => onDateToChange(e.target.value || undefined)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <NewDocumentButton
        onUploadSingle={onUploadSingle}
        onUploadMultiple={onUploadMultiple}
      />
    </div>
  );
}
