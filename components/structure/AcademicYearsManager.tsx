"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { academicYearsService, AcademicYear } from "@/lib/services/academic-years.service";
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
      setShowCreateDialog(false);
      resetForm();
      toast.success("Academic year created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error creating academic year");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      academicYearsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      setShowEditDialog(false);
      setEditingYear(null);
      resetForm();
      toast.success("Academic year updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error updating academic year");
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: academicYearsService.setCurrent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year marked as current");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error marking as current");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: academicYearsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error deleting academic year");
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

  const handleCreate = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Please complete all required fields");
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
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Academic Years</h3>
          <p className="text-sm text-muted-foreground">
            {years?.total || 0} years registered
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Year
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
                  {format(new Date(year.startDate), "dd/MM/yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Fin:</span>{" "}
                  {format(new Date(year.endDate), "dd/MM/yyyy")}
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
                  onClick={() => handleEdit(year)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
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
                placeholder="2024-2025"
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
                placeholder="2024-2025"
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
