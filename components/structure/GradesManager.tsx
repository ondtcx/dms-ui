"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gradesService, Grade } from "@/lib/services/grades.service";
import { levelsService } from "@/lib/services/levels.service";
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
import { GraduationCap, Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export function GradesManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number | undefined>();
  const [selectedLevelId, setSelectedLevelId] = useState<number | undefined>();
  const [formData, setFormData] = useState({
    name: "",
    levelId: 0,
    order: 0,
  });

  const queryClient = useQueryClient();

  const { data: years } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsService.getAll(),
  });

  const { data: levels } = useQuery({
    queryKey: ["levels", selectedYearId],
    queryFn: () => levelsService.getAll({ academicYearId: selectedYearId }),
    enabled: !!selectedYearId,
  });

  const { data: grades, isLoading } = useQuery({
    queryKey: ["grades", selectedLevelId],
    queryFn: () => gradesService.getAll({ levelId: selectedLevelId }),
    enabled: !!selectedLevelId,
  });

  const createMutation = useMutation({
    mutationFn: gradesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      setShowCreateDialog(false);
      resetForm();
      toast.success("Grado creado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al crear grado");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      gradesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      setShowEditDialog(false);
      setEditingGrade(null);
      resetForm();
      toast.success("Grado actualizado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al actualizar grado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: gradesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Grado eliminado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al eliminar grado");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      levelId: 0,
      order: 0,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.levelId) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setFormData({
      name: grade.name,
      levelId: grade.levelId,
      order: grade.order,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingGrade) return;
    const { levelId, ...updateData } = formData;
    updateMutation.mutate({ id: editingGrade.id, data: updateData });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de eliminar este grado?")) {
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

  // Auto-select current academic year on mount
  useEffect(() => {
    if (years?.data && !selectedYearId) {
      const current = years.data.find((y) => y.isCurrent);
      if (current) {
        setSelectedYearId(current.id);
      }
    }
  }, [years, selectedYearId]);

  if (isLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Grados Académicos</h3>
          <p className="text-sm text-muted-foreground">
            {grades?.total || 0} grados registrados
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedYearId?.toString()}
            onValueChange={(val) => {
              setSelectedYearId(val ? Number(val) : undefined);
              setSelectedLevelId(undefined); // Reset level when year changes
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccione año" />
            </SelectTrigger>
            <SelectContent>
              {years?.data.map((year) => (
                <SelectItem key={year.id} value={year.id.toString()}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedLevelId?.toString()}
            onValueChange={(val) => setSelectedLevelId(val ? Number(val) : undefined)}
            disabled={!selectedYearId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccione nivel" />
            </SelectTrigger>
            <SelectContent>
              {levels?.data.map((level) => (
                <SelectItem key={level.id} value={level.id.toString()}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!selectedLevelId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Grado
          </Button>
        </div>
      </div>

      {!selectedYearId && (
        <div className="text-center py-12 text-muted-foreground">
          Seleccione un año académico para ver los grados
        </div>
      )}

      {selectedYearId && !selectedLevelId && (
        <div className="text-center py-12 text-muted-foreground">
          Seleccione un nivel educativo para ver los grados
        </div>
      )}

      {selectedLevelId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades?.data.map((grade) => (
            <Card key={grade.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    {grade.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {getEducationalLevelLabel(grade.level?.educationalLevel || "")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nivel:</span>{" "}
                    {grade.level?.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Año:</span>{" "}
                    {grade.level?.academicYear?.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Orden:</span> {grade.order}
                  </div>
                  {grade._count && (
                    <div className="pt-2 border-t">
                      <div>{grade._count.sections} secciones</div>
                      <div>{grade._count.documents} documentos</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(grade)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(grade.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for creating */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Grado Académico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="1° Básico, 2° Bachillerato"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="levelId">Nivel Educativo *</Label>
              <Select
                value={formData.levelId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, levelId: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el nivel" />
                </SelectTrigger>
                <SelectContent>
                  {levels?.data.map((level) => (
                    <SelectItem key={level.id} value={level.id.toString()}>
                      {level.name} ({getEducationalLevelLabel(level.educationalLevel)})
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
            <DialogTitle>Editar Grado Académico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                placeholder="1° Básico, 2° Bachillerato"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
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
            <div className="text-sm text-muted-foreground">
              Nota: El nivel educativo no puede ser modificado después de la creación.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingGrade(null);
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
