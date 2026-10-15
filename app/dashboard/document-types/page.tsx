"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentTypesService } from "@/lib/services/document-types.service";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import ProtectedRoute from "@/guards/ProtectedRoute";
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
}

function DocumentTypeForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
}: DocumentTypeFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      isActive,
    });
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
        <Label htmlFor="dt-description">Descripción</Label>
        <Textarea
          id="dt-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe para qué se usa este tipo"
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

function DocumentTypesPageContent() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  const { data: documentTypes, isLoading, error } = useQuery({
    queryKey: ["document-types"],
    queryFn: () => documentTypesService.getAll(),
  });

  const filteredTypes = useMemo(() => {
    if (!documentTypes) return [];
    let list = documentTypes;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (dt) =>
          dt.name.toLowerCase().includes(term) ||
          (dt.description ?? "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [documentTypes, searchTerm]);

  const createMutation = useMutation({
    mutationFn: (data: CreateDocumentTypeDto) => documentTypesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success("Tipo creado exitosamente");
      setShowModal(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al crear tipo");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentTypeDto }) =>
      documentTypesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success("Tipo actualizado exitosamente");
      setEditingType(null);
      setShowModal(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al actualizar tipo");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentTypesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      toast.success("Tipo eliminado exitosamente");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Error al eliminar tipo");
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
        <p className="text-red-500">Error al cargar tipos de documento</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tipos de Documento</h1>
        <p className="text-muted-foreground mt-1">
          Administra los tipos de documento para clasificar documentos
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
              <CardTitle>Tipos</CardTitle>
              <CardDescription>
                {filteredTypes.length} de {documentTypes?.length ?? 0} tipos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tipos..."
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
                Nuevo Tipo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando tipos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay tipos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTypes.map((dt) => (
                    <TableRow key={dt.id}>
                      <TableCell>
                        <span className="font-medium">{dt.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {dt.description || "—"}
                        </span>
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
              {editingType ? "Editar Tipo" : "Nuevo Tipo"}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? "Modifica los datos del tipo de documento"
                : "Crea un nuevo tipo de documento"}
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
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar tipo"
        description={`¿Estás seguro de eliminar el tipo "${deleteConfirm?.name}"? Si tiene documentos asociados, no podrá eliminarse.`}
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

export default function DocumentTypesPage() {
  return (
    <ProtectedRoute requiredPermission="document-types.manage">
      <DocumentTypesPageContent />
    </ProtectedRoute>
  );
}
