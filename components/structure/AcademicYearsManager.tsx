"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { academicYearsService } from "@/lib/services/academic-years.service";
import { AcademicYear } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Check, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";

function formatCalendarDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    "dd/MM/yyyy",
  );
}

function nextAcademicYear(years: AcademicYear[] | undefined) {
  const current = years?.find((year) => year.isCurrent) ?? years?.[0];
  const today = new Date();
  const startYear = current
    ? Number(current.name.slice(0, 4)) + 1
    : today.getMonth() >= 8
      ? today.getFullYear()
      : today.getFullYear() - 1;
  return {
    name: `${startYear}-${startYear + 1}`,
    startDate: `${startYear}-09-01`,
    endDate: `${startYear + 1}-06-30`,
  };
}

export function AcademicYearsManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: true,
    isCurrent: false,
  });

  const queryClient = useQueryClient();

  const { data: years, isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: academicYearsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setShowCreateDialog(false);
      resetForm();
      toast.success("Año lectivo creado correctamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "No se pudo crear el año lectivo");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      academicYearsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setShowEditDialog(false);
      setEditingYear(null);
      resetForm();
      toast.success("Año lectivo actualizado correctamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "No se pudo actualizar el año lectivo");
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: academicYearsService.setCurrent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Año lectivo marcado como actual");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "No se pudo marcar como actual");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: academicYearsService.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Año lectivo desactivado correctamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "No se pudo desactivar el año lectivo");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      isActive: true,
      isCurrent: false,
    });
  };

  const openCreateDialog = () => {
    const next = nextAcademicYear(years?.data);
    setFormData({
      name: next.name,
      startDate: next.startDate,
      endDate: next.endDate,
      isActive: true,
      isCurrent: false,
    });
    setShowCreateDialog(true);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: year.startDate.split("T")[0],
      endDate: year.endDate.split("T")[0],
      isActive: year.isActive,
      isCurrent: year.isCurrent,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingYear) return;
    updateMutation.mutate({ id: editingYear.id, data: formData });
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Años lectivos</h3>
          <p className="text-sm text-muted-foreground">
            {years?.total || 0} años registrados
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo año lectivo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {years?.data.map((year) => (
          <Card
            key={year.id}
            className={year.isCurrent ? "border-primary shadow-md" : ""}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {year.name}
                </CardTitle>
                <div className="flex gap-2">
                  {year.isCurrent && (
                    <Badge variant="default">
                      <Check className="mr-1 h-3 w-3" />
                      Actual
                    </Badge>
                  )}
                  {year.isActive && !year.isCurrent && (
                    <Badge variant="secondary">Activo</Badge>
                  )}
                  {!year.isActive && <Badge variant="outline">Inactivo</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Inicio:</span>{" "}
                  {formatCalendarDate(year.startDate)}
                </div>
                <div>
                  <span className="text-muted-foreground">Fin:</span>{" "}
                  {formatCalendarDate(year.endDate)}
                </div>
                {year._count && (
                  <div className="pt-2 border-t">
                    <div>{year._count.levels} niveles</div>
                    <div>{year._count.documents} documentos</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                {!year.isCurrent && year.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setCurrentMutation.mutate(year.id)}
                  >
                    Marcar como actual
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${year.name}`}
                  onClick={() => handleEdit(year)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Eliminar ${year.name}`}
                  onClick={() => handleDelete(year.id)}
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
            <DialogTitle>Nuevo Año Lectivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="2027-2028"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Fin *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Año activo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isCurrent"
                checked={formData.isCurrent}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isCurrent: checked })
                }
              />
              <Label htmlFor="isCurrent">Marcar como año actual</Label>
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
            <DialogTitle>Editar Año Lectivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                placeholder="2027-2028"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Fecha de Inicio *</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">Fecha de Fin *</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="edit-isActive">Año activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingYear(null);
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

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar año académico"
        description="¿Estás seguro de eliminar este año académico?"
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirmId !== null) deleteMutation.mutate(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
      />
    </div>
  );
}
