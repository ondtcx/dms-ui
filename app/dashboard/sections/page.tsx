"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sectionsService } from "@/lib/services/sections.service";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  FolderOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  FileText,
  AlertCircle,
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
import { Section, UpdateSectionDto, SectionStats } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionForm } from "@/components/sections/SectionForm";

export default function SectionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  // Query principal con filtros
  const { data: sectionsResponse, isLoading, error } = useQuery({
    queryKey: ["sections", searchTerm, isActiveFilter],
    queryFn: () =>
      sectionsService.getAll({
        search: searchTerm || undefined,
        isActive: isActiveFilter,
        page: 1,
        limit: 100,
      }),
  });

  // Query de stats para documentCount por sección
  const { data: sectionStats } = useQuery({
    queryKey: ["section-stats"],
    queryFn: () => sectionsService.getStats(),
  });

  // Mapa memoizado para lookup O(1) en render
  const statsMap = useMemo(
    () => new Map<number, SectionStats>(sectionStats?.map((s) => [s.id, s]) ?? []),
    [sectionStats]
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: sectionsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["section-stats"] });
      toast.success("Sección creada exitosamente");
      setShowCreateDialog(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al crear sección");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSectionDto }) =>
      sectionsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["section-stats"] });
      toast.success("Sección actualizada exitosamente");
      setEditingSection(null);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al actualizar sección");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sectionsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["section-stats"] });
      toast.success("Sección eliminada exitosamente");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al eliminar sección");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      sectionsService.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      queryClient.invalidateQueries({ queryKey: ["section-stats"] });
      toast.success("Sección actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar sección");
    },
  });

  const handleEdit = (section: Section) => {
    setEditingSection(section);
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">Error al cargar secciones</p>
        <p className="text-sm text-muted-foreground">
          Verifica la conexión con el servidor
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Secciones</h1>
        <p className="text-muted-foreground mt-2">
          Organiza tus documentos en secciones para facilitar su acceso
        </p>
      </div>

      {/* Barra de acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar secciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por estado */}
            <Select
              value={isActiveFilter === undefined ? "all" : String(isActiveFilter)}
              onValueChange={(v) => {
                setIsActiveFilter(v === "all" ? undefined : v === "true");
                setSearchTerm("");
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Activas</SelectItem>
                <SelectItem value="false">Inactivas</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón nueva sección */}
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sección
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de secciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : sectionsResponse?.data.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay secciones</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primera sección para comenzar
            </p>
          </div>
        ) : (
          sectionsResponse?.data.map((section) => {
            const stats = statsMap.get(section.id);
            return (
              <Card
                key={section.id}
                className="hover:shadow-lg transition-shadow"
                style={{ borderLeft: `4px solid ${section.color}` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate flex items-center gap-2">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${section.color}20` }}
                        >
                          <FileText
                            className="h-4 w-4"
                            style={{ color: section.color }}
                          />
                        </span>
                        {section.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {section.description || "Sin descripción"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(section.id, section.isActive)}
                      title={section.isActive ? "Desactivar" : "Activar"}
                    >
                      {section.isActive ? (
                        <Power className="h-4 w-4 text-green-600" />
                      ) : (
                        <PowerOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator />

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {section._count?.categories ?? 0} categoría(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {stats?.documentCount ?? 0} documento(s)
                    </span>
                    <Badge
                      variant={section.isActive ? "default" : "secondary"}
                      style={
                        section.isActive
                          ? { backgroundColor: section.color }
                          : undefined
                      }
                    >
                      {section.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(section)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(section.id, section.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog unificado — crear y editar */}
      <Dialog
        open={showCreateDialog || editingSection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingSection(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Editar Sección" : "Nueva Sección"}
            </DialogTitle>
          </DialogHeader>
          <SectionForm
            key={editingSection?.id ?? "new"}
            initialValues={editingSection ?? undefined}
            onSubmit={(data) => {
              if (editingSection) {
                updateMutation.mutate({ id: editingSection.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowCreateDialog(false);
              setEditingSection(null);
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar sección"
        description={`¿Estás seguro de eliminar la sección "${deleteConfirm?.name}"?`}
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
