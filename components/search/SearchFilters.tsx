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
import { categoriesService } from "@/lib/services/categories.service";
import { useState } from "react";

const MIME_OPTIONS = [
  { label: "PDF", value: "application/pdf" },
  { label: "Word", value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { label: "Excel", value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { label: "Imagen", value: "image/" },
];

const SORT_OPTIONS = [
  { label: "Relevancia", value: "relevance" },
  { label: "Más reciente", value: "createdAt" },
  { label: "Nombre", value: "filename" },
  { label: "Tamaño", value: "size" },
];

export interface SearchFiltersValue {
  categoryIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  mimetypes?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface SearchFiltersProps {
  value: SearchFiltersValue;
  onChange: (filters: SearchFiltersValue) => void;
}

export function SearchFilters({ value, onChange }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoriesService.getActive(),
    staleTime: 5 * 60_000,
  });

  const activeCount = [
    value.categoryIds?.length,
    value.dateFrom || value.dateTo ? 1 : 0,
    value.mimetypes?.length,
  ].reduce((acc: number, v) => acc + (v ? 1 : 0), 0);

  const handleMimeToggle = (mime: string, checked: boolean) => {
    const current = value.mimetypes ?? [];
    const next = checked
      ? [...current, mime]
      : current.filter((m) => m !== mime);
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
        <div className="mt-4 p-4 border rounded-lg bg-muted/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Categoría */}
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={value.categoryIds?.[0]?.toString() ?? "all"}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  categoryIds: v === "all" ? undefined : [parseInt(v)],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories
                  ?.filter((c) => c.isActive)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rango de fechas */}
          <div className="space-y-2">
            <Label>Fecha desde</Label>
            <Input
              type="date"
              value={value.dateFrom ?? ""}
              onChange={(e) =>
                onChange({ ...value, dateFrom: e.target.value || undefined })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha hasta</Label>
            <Input
              type="date"
              value={value.dateTo ?? ""}
              onChange={(e) =>
                onChange({ ...value, dateTo: e.target.value || undefined })
              }
            />
          </div>

          {/* Tipo de archivo */}
          <div className="space-y-2 md:col-span-2 lg:col-span-4">
            <Separator />
            <Label>Tipo de archivo</Label>
            <div className="flex flex-wrap gap-4">
              {MIME_OPTIONS.map((m) => (
                <div key={m.value} className="flex items-center gap-2">
                  <Checkbox
                    id={m.value}
                    checked={value.mimetypes?.some((x) => x.startsWith(m.value)) ?? false}
                    onCheckedChange={(checked) =>
                      handleMimeToggle(m.value, checked as boolean)
                    }
                  />
                  <Label htmlFor={m.value} className="font-normal cursor-pointer">
                    {m.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
