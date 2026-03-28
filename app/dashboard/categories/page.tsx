"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesService } from "@/lib/services/categories.service";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  FolderKanban,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Search,
  FileText,
} from "lucide-react";
import { Category, CreateCategoryDto, UpdateCategoryDto } from "@/lib/types";
import { derivePrefix } from "@/lib/utils/document-numbering";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.getAll(),
  });

  // Filtrado client-side por nombre o descripción
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.description ?? "").toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // Stats calculadas sobre el total (no sobre el filtrado)
  const totalDocs = useMemo(
    () => categories?.reduce((acc, c) => acc + (c._count?.documents ?? 0), 0) ?? 0,
    [categories]
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryDto) => categoriesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría creada exitosamente");
      setShowModal(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al crear categoría");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryDto }) =>
      categoriesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría actualizada exitosamente");
      setEditingCategory(null);
      setShowModal(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al actualizar categoría");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría eliminada exitosamente");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al eliminar categoría");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      categoriesService.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Estado actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar estado");
    },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name });
  };

  // CreateCategoryDto satisface UpdateCategoryDto sin necesidad de cast
  const handleFormSubmit = (data: CreateCategoryDto) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error al cargar categorías</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Categorías</h1>
        <p className="text-muted-foreground mt-1">
          Administra las categorías para organizar tus documentos
        </p>
      </div>

      {/* Stats — 4 cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Power className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {categories?.filter((c) => c.isActive).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
            <PowerOff className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {categories?.filter((c) => !c.isActive).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla con búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categorías</CardTitle>
              <CardDescription>
                {filteredCategories.length} de {categories?.length ?? 0} categorías
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorías..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setShowModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Categoría
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando categorías...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Req. Curso</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {category.section ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: category.section.color,
                            color: category.section.color,
                          }}
                        >
                          {category.section.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.prefix ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {category.prefix}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-xs" title="Derivado automáticamente del nombre">
                          {derivePrefix(category.name) || "—"}
                          <span className="ml-1 opacity-60 text-[10px]">auto</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
                        {category.description || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {category.requiresCourse ? (
                        <Badge variant="secondary">Sí</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums">
                        {category._count?.documents ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={category.isActive ? "default" : "secondary"}
                        className={category.isActive ? "bg-green-500" : ""}
                      >
                        {category.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: category.id,
                              isActive: !category.isActive,
                            })
                          }
                          title={category.isActive ? "Desactivar" : "Activar"}
                        >
                          {category.isActive ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category.id, category.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog unificado — crear y editar */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowModal(false);
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifica los datos de la categoría"
                : "Crea una nueva categoría para organizar documentos"}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            key={editingCategory?.id ?? "new"}
            initialValues={editingCategory ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowModal(false);
              setEditingCategory(null);
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar categoría"
        description={`¿Estás seguro de eliminar la categoría "${deleteConfirm?.name}"?`}
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
