"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
import { categoriesService } from "@/lib/services/categories.service";
import { documentTypesService } from "@/lib/services/document-types.service";
import { useState, useEffect, useRef, useMemo } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FileType,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Eye,
  Power,
  PowerOff,
  FileSearch,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DocumentTemplate } from "@/lib/types";
import { CreateTemplateDialog } from "@/components/templates/CreateTemplateDialog";
import { PreviewTemplateDialog } from "@/components/templates/PreviewTemplateDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "name" | "date" | "usage";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] =
    useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<DocumentTemplate | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] =
    useState<DocumentTemplate | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const blobUrlsRef = useRef<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  // Queries
  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", searchTerm, categoryFilter, documentTypeFilter],
    queryFn: () =>
      templatesService.getAll({
        search: searchTerm || undefined,
        categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
        documentTypeId: documentTypeFilter !== "all" ? Number(documentTypeFilter) : undefined,
        page: 1,
        limit: 50,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: categoriesService.getActive,
  });

  const { data: documentTypes } = useQuery({
    queryKey: ["document-types", "active", categoryFilter],
    queryFn: () => documentTypesService.getActive(categoryFilter !== "all" ? Number(categoryFilter) : undefined),
    enabled: categoryFilter !== "all",
  });

  // Load thumbnails — mismo patrón que documents page (useRef para cleanup en unmount)
  useEffect(() => {
    if (!templates?.data) return;
    const loadThumbnails = async () => {
      for (const template of templates.data) {
        if (thumbnailUrls[template.id]) continue;
        try {
          const blob = await templatesService.getThumbnail(template.id);
          const url = URL.createObjectURL(blob);
          blobUrlsRef.current.push(url);
          setThumbnailUrls((prev) => ({ ...prev, [template.id]: url }));
        } catch {
          // thumbnail no disponible, se muestra placeholder
        }
      }
    };
    loadThumbnails();
  }, [templates?.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup blob URLs solo en unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Sort templates based on selected option
  const sortedTemplates = useMemo(() => {
    if (!templates?.data) return [];

    const sorted = [...templates.data];

    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "date":
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "usage":
        sorted.sort(
          (a, b) => (b._count?.documents || 0) - (a._count?.documents || 0)
        );
        break;
    }

    return sorted;
  }, [templates?.data, sortBy]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: templatesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-types"] });
      toast.success("Plantilla eliminada exitosamente");
    },
    onError: () => {
      toast.error("Error al eliminar plantilla");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      templatesService.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar plantilla");
    },
  });

  // Handlers
  const handleUseTemplate = (template: DocumentTemplate) => {
    router.push(`/dashboard/templates/${template.id}/create`);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setShowCreateTemplateDialog(true);
  };

  const handlePreviewTemplate = (template: DocumentTemplate) => {
    setPreviewingTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleDeleteTemplate = (id: number, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const handleCreateTemplateSuccess = () => {
    setShowCreateTemplateDialog(false);
    setEditingTemplate(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Plantillas de Documentos
        </h1>
        <p className="text-muted-foreground mt-2">
          Crea y gestiona plantillas para generar documentos estructurados
        </p>
      </div>

      {/* Categorías disponibles */}
      {categories && categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.filter((c) => c.isActive).map((cat) => (
            <Badge
              key={cat.id}
              variant="outline"
              className="cursor-pointer"
              style={categoryFilter === cat.id.toString() ? { borderColor: cat.color, color: cat.color } : {}}
              onClick={() => setCategoryFilter(categoryFilter === cat.id.toString() ? "all" : cat.id.toString())}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Barra de acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por categoría */}
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setDocumentTypeFilter("all");
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories?.filter((c) => c.isActive).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por subtipo */}
            <Select
              value={documentTypeFilter}
              onValueChange={setDocumentTypeFilter}
              disabled={categoryFilter === "all"}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por subtipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los subtipos</SelectItem>
                {documentTypes?.map((dt) => (
                  <SelectItem key={dt.id} value={dt.id.toString()}>
                    {dt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ordenar por */}
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-[200px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Más recientes</SelectItem>
                <SelectItem value="name">Nombre (A-Z)</SelectItem>
                <SelectItem value="usage">Más usadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón nueva plantilla */}
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setShowCreateTemplateDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de plantillas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <FileType className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay plantillas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primera plantilla para comenzar
            </p>
          </div>
        ) : (
          sortedTemplates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Thumbnail Preview */}
              <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800">
                {thumbnailUrls[template.id] ? (
                  <img
                    src={thumbnailUrls[template.id]}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <FileType className="h-12 w-12 text-slate-400" />
                    <span className="text-xs text-slate-400">{template.category?.name ?? template.documentType?.name ?? '—'}</span>
                  </div>
                )}

                {/* Status Badge Overlay */}
                <div className="absolute top-2 right-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 backdrop-blur-sm hover:bg-background"
                    onClick={() =>
                      handleToggleActive(template.id, template.isActive)
                    }
                    title={template.isActive ? "Desactivar" : "Activar"}
                  >
                    {template.isActive ? (
                      <Power className="h-4 w-4 text-green-600" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {template.category ? (
                        <Badge
                          variant="outline"
                          className="mt-1"
                          style={{ borderColor: template.category.color, color: template.category.color }}
                        >
                          {template.category.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-1">
                          {template.documentType?.name ?? '—'}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {template.description || "Sin descripción"}
                </p>

                <Separator />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {template.fields?.fields?.length ?? 0} campos
                  </span>
                  <span>{template._count?.documents || 0} docs</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    disabled={!template.isActive}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Usar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/templates/${template.id}/batch`)}
                    disabled={!template.isActive}
                    title="Generar en lote"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewTemplate(template)}
                    title="Vista previa de la plantilla"
                  >
                    <FileSearch className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDeleteTemplate(template.id, template.name)
                    }
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo para crear/editar plantilla */}
      <CreateTemplateDialog
        open={showCreateTemplateDialog}
        onOpenChange={(open) => {
          setShowCreateTemplateDialog(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSuccess={handleCreateTemplateSuccess}
      />

      {/* Diálogo para previsualizar plantilla */}
      {previewingTemplate && (
        <PreviewTemplateDialog
          template={previewingTemplate}
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar plantilla"
        description={`¿Estás seguro de eliminar la plantilla "${deleteConfirm?.name}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
