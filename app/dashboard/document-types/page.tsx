"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentTypesService } from "@/lib/services/document-types.service";
import { categoriesService } from "@/lib/services/categories.service";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Search,
  FileText,
  FileType,
} from "lucide-react";
import {
  DocumentType,
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DocumentTypeFormProps {
  initialValues?: DocumentType;
  onSubmit: (data: CreateDocumentTypeDto) => void;
  onCancel: () => void;
  isPending: boolean;
  categories: { id: number; name: string; isActive: boolean }[];
}

function DocumentTypeForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  categories,
}: DocumentTypeFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | undefined>(initialValues?.categoryId);
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!categoryId) {
      toast.error("La categoría es requerida");
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() || undefined, categoryId, isActive });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dt-name">
          Nombre <span className="text-red-500">*</span>
        </Label>
        <Input
          id="dt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Oficio Interno, Acta de Reunión"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dt-category">
          Categoría <span className="text-red-500">*</span>
        </Label>
        <Select
          value={categoryId?.toString() ?? ""}
          onValueChange={(v) => setCategoryId(Number(v))}
        >
          <SelectTrigger id="dt-category">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.filter((c) => c.isActive).map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dt-description">Descripción</Label>
        <Textarea
          id="dt-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe para qué se usa este subtipo"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="dt-isActive"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked as boolean)}
        />
        <label
          htmlFor="dt-isActive"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Activo
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : initialValues ? "Actualizar" : "Crear"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function DocumentTypesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  const { data: documentTypes, isLoading, error } = useQuery({
    queryKey: ["document-types"],
    queryFn: () => documentTypesService.getAll(),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: categoriesService.getActive,
  });

  const filteredTypes = useMemo(() => {
    if (!documentTypes) return [];
    let list = documentTypes;
    if (categoryFilter !== "all") {
      list = list.filter((dt) => dt.categoryId === Number(categoryFilter));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (dt) =>
          dt.name.toLowerCase().includes(term) ||
          (dt.description ?? "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [documentTypes, searchTerm, categoryFilter]);

  const createMutation = useMutation({
    mutationFn: (data: CreateDocumentTypeDto) => documentTypesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success("Subtipo creado exitosamente");
      setShowModal(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al crear subtipo");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentTypeDto }) =>
      documentTypesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success("Subtipo actualizado exitosamente");
      setEditingType(null);
      setShowModal(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al actualizar subtipo");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentTypesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success("Subtipo eliminado exitosamente");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al eliminar subtipo");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      documentTypesService.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success("Estado actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar estado");
    },
  });

  const handleFormSubmit = (data: CreateDocumentTypeDto) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error al cargar subtipos de documento</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subtipos de Documento</h1>
        <p className="text-muted-foreground mt-1">
          Administra los subtipos dentro de cada categoría para clasificar documentos y plantillas
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentTypes?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Power className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {documentTypes?.filter((dt) => dt.isActive).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plantillas</CardTitle>
            <FileType className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documentTypes?.reduce((acc, dt) => acc + (dt._count?.documentTemplates ?? 0), 0) ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documentTypes?.reduce((acc, dt) => acc + (dt._count?.documents ?? 0), 0) ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subtipos</CardTitle>
              <CardDescription>
                {filteredTypes.length} de {documentTypes?.length ?? 0} subtipos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar subtipos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>
              <Button
                onClick={() => {
                  setEditingType(null);
                  setShowModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Subtipo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando subtipos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Plantillas</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay subtipos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTypes.map((dt) => (
                    <TableRow key={dt.id}>
                      <TableCell>
                        <span className="font-medium">{dt.name}</span>
                      </TableCell>
                      <TableCell>
                        {dt.category ? (
                          <Badge
                            variant="outline"
                            style={{ borderColor: dt.category.color, color: dt.category.color }}
                          >
                            {dt.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {dt.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">{dt._count?.documentTemplates ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">{dt._count?.documents ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={dt.isActive ? "default" : "secondary"}
                          className={dt.isActive ? "bg-green-500" : ""}
                        >
                          {dt.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: dt.id, isActive: !dt.isActive })
                            }
                            title={dt.isActive ? "Desactivar" : "Activar"}
                          >
                            {dt.isActive ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingType(dt);
                              setShowModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm({ id: dt.id, name: dt.name })}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowModal(false);
            setEditingType(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Editar Subtipo" : "Nuevo Subtipo"}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? "Modifica los datos del subtipo de documento"
                : "Crea un nuevo subtipo dentro de una categoría"}
            </DialogDescription>
          </DialogHeader>
          <DocumentTypeForm
            key={editingType?.id ?? "new"}
            initialValues={editingType ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowModal(false);
              setEditingType(null);
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
            categories={categories ?? []}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar subtipo"
        description={`¿Estás seguro de eliminar el subtipo "${deleteConfirm?.name}"? Si tiene documentos o plantillas asociados, no podrá eliminarse.`}
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
