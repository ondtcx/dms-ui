"use client";

import { useQuery } from "@tanstack/react-query";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { documentTypesService } from "@/lib/services/document-types.service";
import { useState } from "react";

const MIME_OPTIONS = [
  { label: "PDF", values: ["application/pdf"] },
  { label: "Word", values: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"] },
  { label: "Excel", values: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"] },
  { label: "Imagen", values: ["image/"] },
];

const SORT_OPTIONS = [
  { label: "Relevancia", value: "relevance" },
  { label: "Más reciente", value: "createdAt" },
  { label: "Nombre", value: "filename" },
  { label: "Tamaño", value: "size" },
];

export interface SearchFiltersValue {
  documentTypeIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  mimetypes?: string[];
  includeContent?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface SearchFiltersProps {
  value: SearchFiltersValue;
  onChange: (filters: SearchFiltersValue) => void;
}

export function SearchFilters({ value, onChange }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);

  const { data: documentTypes } = useQuery({
    queryKey: ["document-types", "active"],
    queryFn: () => documentTypesService.getActive(),
    staleTime: 5 * 60_000,
  });

  const activeCount = [
    value.documentTypeIds?.length,
    value.dateFrom || value.dateTo ? 1 : 0,
    value.mimetypes?.length,
    value.includeContent ? 1 : 0,
  ].reduce((acc: number, v) => acc + (v ? 1 : 0), 0);

  const handleMimeToggle = (mimes: string[], checked: boolean) => {
    const current = value.mimetypes ?? [];
    const matches = (mime: string) => mimes.some(m => m === "image/" ? mime.startsWith(m) : mime === m);
    const next = checked
      ? Array.from(new Set([...current, ...mimes]))
      : current.filter((m) => !matches(m));
    onChange({ ...value, mimetypes: next.length ? next : undefined });
  };

  const handleReset = () => {
    onChange({ sortBy: value.sortBy, sortOrder: value.sortOrder });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeCount}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>

        <Select
          value={value.sortBy ?? "relevance"}
          onValueChange={(v) => onChange({ ...value, sortBy: v })}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.sortOrder ?? "desc"}
          onValueChange={(v) => onChange({ ...value, sortOrder: v as "asc" | "desc" })}
        >
          <SelectTrigger className="w-[110px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descendente</SelectItem>
            <SelectItem value="asc">Ascendente</SelectItem>
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="mr-1 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="mt-4 p-4 border rounded-lg bg-muted/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tipo institucional */}
          <div className="space-y-2">
            <Label htmlFor="search-document-type">Tipo de documento institucional</Label>
            <Select
              value={value.documentTypeIds?.[0]?.toString() ?? "all"}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  documentTypeIds: v === "all" ? undefined : [Number(v)],
                })
              }
            >
              <SelectTrigger id="search-document-type">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {value.documentTypeIds?.[0] && !documentTypes?.some(t => t.isActive && t.id === value.documentTypeIds?.[0]) && (
                  <SelectItem value={String(value.documentTypeIds[0])}>
                    Tipo institucional #{value.documentTypeIds[0]}
                  </SelectItem>
                )}
                {documentTypes?.filter(t => t.isActive).map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}{documentTypes.filter(other => other.isActive && other.name === t.name).length > 1
                      ? ` (${t.category?.name ?? `Categoría #${t.categoryId}`})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rango de fechas */}
          <div className="space-y-2">
            <Label htmlFor="search-date-from">Fecha de subida desde</Label>
            <Input
              id="search-date-from"
              max={value.dateTo?.slice(0, 10)}
              type="date"
              value={value.dateFrom ?? ""}
              onChange={(e) =>
                onChange({ ...value, dateFrom: e.target.value || undefined })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-date-to">Fecha de subida hasta</Label>
            <Input
              id="search-date-to"
              min={value.dateFrom?.slice(0, 10)}
              type="date"
              value={value.dateTo ?? ""}
              onChange={(e) =>
                onChange({ ...value, dateTo: e.target.value || undefined })
              }
            />
          </div>

          {/* Tipo de archivo */}
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Separator />
            <Label>Formato de archivo</Label>
            <div className="flex flex-wrap gap-4">
              {MIME_OPTIONS.map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <Checkbox
                    id={`search-format-${m.label}`}
                    checked={value.mimetypes?.some(x => m.values.some(mime => mime === "image/" ? x.startsWith(mime) : x === mime)) ?? false}
                    onCheckedChange={(checked) =>
                      handleMimeToggle(m.values, checked === true)
                    }
                  />
                  <Label htmlFor={`search-format-${m.label}`} className="font-normal cursor-pointer">
                    {m.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Búsqueda en el contenido */}
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Separator />
            <div className="flex items-center gap-2">
              <Checkbox
                id="search-content"
                checked={value.includeContent === true}
                onCheckedChange={(checked) =>
                  onChange({ ...value, includeContent: checked === true ? true : undefined })
                }
              />
              <Label htmlFor="search-content" className="font-normal cursor-pointer">
                Buscar también en el contenido
              </Label>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
