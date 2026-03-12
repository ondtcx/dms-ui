"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { levelsService, Level, EducationalLevel } from "@/lib/services/levels.service";
import { academicYearsService } from "@/lib/services/academic-years.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FolderTree, Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export function LevelsManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number | undefined>();
  const [formData, setFormData] = useState({
    name: "",
    educationalLevel: "" as EducationalLevel,
    academicYearId: 0,
    order: 0,
  });

  const queryClient = useQueryClient();

  const { data: years } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsService.getAll(),
  });

  const { data: levels, isLoading } = useQuery({
    queryKey: ["levels", selectedYearId],
    queryFn: () => levelsService.getAll({ academicYearId: selectedYearId }),
  });

  const createMutation = useMutation({
    mutationFn: levelsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      setShowCreateDialog(false);
      resetForm();
      toast.success("Nivel creado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al crear nivel");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      levelsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      setShowEditDialog(false);
      setEditingLevel(null);
      resetForm();
      toast.success("Nivel actualizado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al actualizar nivel");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: levelsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Nivel eliminado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al eliminar nivel");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      educationalLevel: "" as EducationalLevel,
      academicYearId: 0,
      order: 0,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.educationalLevel || !formData.academicYearId) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (level: Level) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      educationalLevel: level.educationalLevel,
      academicYearId: level.academicYearId,
      order: level.order,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingLevel) return;
    const { academicYearId, ...updateData } = formData;
    updateMutation.mutate({ id: editingLevel.id, data: updateData });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de eliminar este nivel?")) {
      deleteMutation.mutate(id);
    }
  };

  const getEducationalLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      PREESCOLAR: "Preescolar",
      PRIMARIA: "Primaria",
      SECUNDARIA: "Secundaria",
      BACHILLERATO: "Bachillerato",
      UNIVERSIDAD: "Universidad",
    };
    return labels[level] || level;
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Niveles Educativos</h3>
          <p className="text-sm text-muted-foreground">
            {levels?.total || 0} niveles registrados
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedYearId?.toString()}
            onValueChange={(val) => setSelectedYearId(val ? Number(val) : undefined)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los años</SelectItem>
              {years?.data.map((year) => (
                <SelectItem key={year.id} value={year.id.toString()}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Nivel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels?.data.map((level) => (
          <Card key={level.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5" />
                  {level.name}
                </CardTitle>
                <Badge variant="secondary">
                  {getEducationalLevelLabel(level.educationalLevel)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Año:</span>{" "}
                  {level.academicYear?.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Orden:</span> {level.order}
                </div>
                {level._count && (
                  <div className="pt-2 border-t">
                    <div>{level._count.grades} grados</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(level)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(level.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog for creating */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Nivel Educativo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Educación Básica"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="educationalLevel">Nivel Educativo *</Label>
              <Select
                value={formData.educationalLevel}
                onValueChange={(value) =>
                  setFormData({ ...formData, educationalLevel: value as EducationalLevel })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREESCOLAR">Preescolar</SelectItem>
                  <SelectItem value="PRIMARIA">Primaria</SelectItem>
                  <SelectItem value="SECUNDARIA">Secundaria</SelectItem>
                  <SelectItem value="BACHILLERATO">Bachillerato</SelectItem>
                  <SelectItem value="UNIVERSIDAD">Universidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="academicYearId">Año Académico *</Label>
              <Select
                value={formData.academicYearId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, academicYearId: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el año" />
                </SelectTrigger>
                <SelectContent>
                  {years?.data.map((year) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Orden</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for editing */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nivel Educativo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                placeholder="Educación Básica"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-educationalLevel">Nivel Educativo *</Label>
              <Select
                value={formData.educationalLevel}
                onValueChange={(value) =>
                  setFormData({ ...formData, educationalLevel: value as EducationalLevel })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREESCOLAR">Preescolar</SelectItem>
                  <SelectItem value="PRIMARIA">Primaria</SelectItem>
                  <SelectItem value="SECUNDARIA">Secundaria</SelectItem>
                  <SelectItem value="BACHILLERATO">Bachillerato</SelectItem>
                  <SelectItem value="UNIVERSIDAD">Universidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-order">Orden</Label>
              <Input
                id="edit-order"
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingLevel(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
