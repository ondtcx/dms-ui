"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Clock,
  TrendingUp,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SearchFilters, SearchFiltersValue } from "@/components/search/SearchFilters";
import { searchService } from "@/lib/services/search.service";
import { documentsService } from "@/lib/services/documents.service";
import { Document } from "@/lib/types";
import toast from "react-hot-toast";

function getFileIcon(mimetype: string) {
  if (mimetype === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (mimetype.startsWith("image/")) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (mimetype.includes("word") || mimetype.includes("document"))
    return <FileCode className="h-5 w-5 text-blue-700" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = searchParams.get("q") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");

  const [filters, setFilters] = useState<SearchFiltersValue>({
    sortBy: searchParams.get("sortBy") ?? "relevance",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc",
    categoryIds: searchParams.get("categoryId")
      ? [parseInt(searchParams.get("categoryId")!)]
      : undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });

  // Sync filters to URL
  const updateURL = useCallback(
    (newFilters: SearchFiltersValue, newPage = 1) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (newPage > 1) params.set("page", String(newPage));
      if (newFilters.sortBy && newFilters.sortBy !== "relevance")
        params.set("sortBy", newFilters.sortBy);
      if (newFilters.sortOrder && newFilters.sortOrder !== "desc")
        params.set("sortOrder", newFilters.sortOrder);
      if (newFilters.categoryIds?.[0])
        params.set("categoryId", String(newFilters.categoryIds[0]));
      if (newFilters.dateFrom) params.set("dateFrom", newFilters.dateFrom);
      if (newFilters.dateTo) params.set("dateTo", newFilters.dateTo);
      router.push(`/dashboard/search?${params.toString()}`);
    },
    [query, router],
  );

  const handleFiltersChange = (newFilters: SearchFiltersValue) => {
    setFilters(newFilters);
    updateURL(newFilters, 1);
  };

  const handlePageChange = (newPage: number) => {
    updateURL(filters, newPage);
  };

  // Main search query
  const { data, isLoading } = useQuery({
    queryKey: ["search", query, page, filters],
    queryFn: () =>
      searchService.search({
        query,
        page,
        limit: 20,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        categoryIds: filters.categoryIds,
        sectionIds: filters.sectionIds,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        mimetypes: filters.mimetypes,
      }),
    enabled: !!query.trim(),
    staleTime: 30_000,
  });

  // History and popular (shown when no query)
  const { data: history } = useQuery({
    queryKey: ["search-history"],
    queryFn: () => searchService.getHistory(),
    enabled: !query,
    staleTime: 60_000,
  });

  const { data: popular } = useQuery({
    queryKey: ["search-popular"],
    queryFn: () => searchService.getPopular(),
    enabled: !query,
    staleTime: 5 * 60_000,
  });

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await documentsService.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ((doc?.versions?.[0]?.filename) ?? '');
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar el documento");
    }
  };

  const navigateToSearch = (q: string) => {
    router.push(`/dashboard/search?q=${encodeURIComponent(q)}`);
  };

  // Empty state — no query
  if (!query) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Buscar documentos</h1>
          <p className="text-muted-foreground mt-1">
            Usa la barra de búsqueda del encabezado para encontrar documentos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history && history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Búsquedas recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {history.slice(0, 8).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => navigateToSearch(h.query)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted text-sm text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      {h.query}
                    </span>
                    {h.resultCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {h.resultCount} docs
                      </span>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {popular && popular.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Búsquedas populares
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {popular.slice(0, 8).map((p) => (
                  <button
                    key={p.query}
                    onClick={() => navigateToSearch(p.query)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted text-sm text-left"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.query}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {(p as any).count ?? p.resultCount}×
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Resultados para{" "}
            <span className="text-primary">"{query}"</span>
          </h1>
          {!isLoading && data && (
            <p className="text-muted-foreground mt-1 text-sm">
              {data.meta.total} documento{data.meta.total !== 1 ? "s" : ""} encontrado
              {data.meta.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Filtros */}
      <SearchFilters value={filters} onChange={handleFiltersChange} />

      <Separator />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sin resultados */}
      {!isLoading && data && data.data.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">
            No se encontraron documentos para "{query}"
          </p>
          <p className="text-sm mt-1">
            Intenta con otros términos o ajusta los filtros.
          </p>
        </div>
      )}

      {/* Resultados */}
      {!isLoading && data && data.data.length > 0 && (
        <div className="space-y-2">
          {data.data.map((doc: Document) => (
            <Card key={doc.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {getFileIcon(((doc?.versions?.[0]?.mimetype) ?? ''))}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{((doc?.versions?.[0]?.filename) ?? '')}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDownload(doc)}
                          title="Descargar"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      {doc.category && (
                        <Badge variant="secondary" className="text-xs">
                          {doc.category.name}
                        </Badge>
                      )}
                      {doc.category?.section && (
                        <span className="text-xs text-muted-foreground">
                          {doc.category.section.name}
                        </span>
                      )}
                      {doc.uploadedBy && (
                        <span className="text-xs text-muted-foreground">
                          {doc.uploadedBy.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(((doc?.versions?.[0]?.size) ?? 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginación */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <span className="text-sm text-muted-foreground px-2">
            Página {page} de {data.meta.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!data.meta.hasNextPage}
            onClick={() => handlePageChange(page + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}


export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Skeleton className="h-8 w-64" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
