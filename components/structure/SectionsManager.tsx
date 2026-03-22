"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { academicSectionsService as sectionsService, AcademicSection } from "@/lib/services/academic-sections.service";
import { gradesService } from "@/lib/services/grades.service";
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
import { Users, Plus, Pencil, Trash2, UserPlus, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function SectionsManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTeachersDialog, setShowTeachersDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<AcademicSection | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number | undefined>();
  const [selectedLevelId, setSelectedLevelId] = useState<number | undefined>();
  const [selectedGradeId, setSelectedGradeId] = useState<number | undefined>();
  const [formData, setFormData] = useState({
    name: "",
    gradeId: 0,
    maxStudents: 30,
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

  const { data: grades } = useQuery({
    queryKey: ["grades", selectedLevelId],
    queryFn: () => gradesService.getAll({ levelId: selectedLevelId }),
    enabled: !!selectedLevelId,
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ["sections", selectedGradeId],
    queryFn: () => sectionsService.getAll({ gradeId: selectedGradeId }),
    enabled: !!selectedGradeId,
  });

  const createMutation = useMutation({
    mutationFn: sectionsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setShowCreateDialog(false);
      resetForm();
      toast.success("Sección creada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al crear sección");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      sectionsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setShowEditDialog(false);
      setEditingSection(null);
      resetForm();
      toast.success("Sección actualizada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al actualizar sección");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sectionsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Sección eliminada exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al eliminar sección");
    },
  });

  const addTeacherMutation = useMutation({
    mutationFn: ({ sectionId, teacherId }: { sectionId: number; teacherId: string }) =>
      sectionsService.addTeacher(sectionId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Profesor asignado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al asignar profesor");
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: ({ sectionId, teacherId }: { sectionId: number; teacherId: string }) =>
      sectionsService.removeTeacher(sectionId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Profesor removido exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al remover profesor");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      gradeId: 0,
      maxStudents: 30,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.gradeId) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (section: AcademicSection) => {
    setEditingSection(section);
    setFormData({
      name: section.name,
      gradeId: section.gradeId,
      maxStudents: section.maxStudents || 30,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingSection) return;
    const { gradeId, ...updateData } = formData;
    updateMutation.mutate({ id: editingSection.id, data: updateData });
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const handleManageTeachers = (section: AcademicSection) => {
    setEditingSection(section);
    setShowTeachersDialog(true);
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
          <h3 className="text-lg font-semibold">Secciones Académicas</h3>
          <p className="text-sm text-muted-foreground">
            {sections?.total || 0} secciones registradas
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedYearId?.toString()}
            onValueChange={(val) => {
              setSelectedYearId(val ? Number(val) : undefined);
              setSelectedLevelId(undefined);
              setSelectedGradeId(undefined);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Año" />
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
            onValueChange={(val) => {
              setSelectedLevelId(val ? Number(val) : undefined);
              setSelectedGradeId(undefined);
            }}
            disabled={!selectedYearId}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              {levels?.data.map((level) => (
                <SelectItem key={level.id} value={level.id.toString()}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedGradeId?.toString()}
            onValueChange={(val) => setSelectedGradeId(val ? Number(val) : undefined)}
            disabled={!selectedLevelId}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Grado" />
            </SelectTrigger>
            <SelectContent>
              {grades?.data.map((grade) => (
                <SelectItem key={grade.id} value={grade.id.toString()}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!selectedGradeId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Sección
          </Button>
        </div>
      </div>

      {!selectedYearId && (
        <div className="text-center py-12 text-muted-foreground">
          Seleccione un año académico para ver las secciones
        </div>
      )}

      {selectedYearId && !selectedLevelId && (
        <div className="text-center py-12 text-muted-foreground">
          Seleccione un nivel educativo para ver las secciones
        </div>
      )}

      {selectedLevelId && !selectedGradeId && (
        <div className="text-center py-12 text-muted-foreground">
          Seleccione un grado para ver las secciones
        </div>
      )}

      {selectedGradeId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections?.data.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Sección {section.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {getEducationalLevelLabel(
                      section.grade?.level?.educationalLevel || ""
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Grado:</span>{" "}
                    {section.grade?.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nivel:</span>{" "}
                    {section.grade?.level?.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Año:</span>{" "}
                    {section.grade?.level?.academicYear?.name}
                  </div>
                  {section.maxStudents && (
                    <div>
                      <span className="text-muted-foreground">Cupo máximo:</span>{" "}
                      {section.maxStudents} estudiantes
                    </div>
                  )}
                  {section._count && (
                    <div className="pt-2 border-t space-y-1">
                      <div>{section._count.students} estudiantes</div>
                      <div>{section._count.teachers} profesores</div>
                      <div>{section._count.documents} documentos</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageTeachers(section)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(section)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(section.id)}
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
            <DialogTitle>Nueva Sección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="A, B, C, Vespertino..."
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradeId">Grado *</Label>
              <Select
                value={formData.gradeId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, gradeId: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el grado" />
                </SelectTrigger>
                <SelectContent>
                  {grades?.data.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id.toString()}>
                      {grade.name} - {grade.level?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Cupo Máximo</Label>
              <Input
                id="maxStudents"
                type="number"
                min="1"
                value={formData.maxStudents}
                onChange={(e) =>
                  setFormData({ ...formData, maxStudents: Number(e.target.value) })
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
            <DialogTitle>Editar Sección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                placeholder="A, B, C, Vespertino..."
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-maxStudents">Cupo Máximo</Label>
              <Input
                id="edit-maxStudents"
                type="number"
                min="1"
                value={formData.maxStudents}
                onChange={(e) =>
                  setFormData({ ...formData, maxStudents: Number(e.target.value) })
                }
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Nota: El grado no puede ser modificado después de la creación.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingSection(null);
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

      {/* Dialog for managing teachers */}
      <Dialog open={showTeachersDialog} onOpenChange={setShowTeachersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Profesores de Sección {editingSection?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {editingSection?.teachers && editingSection.teachers.length > 0 ? (
                <div className="space-y-2">
                  {editingSection.teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {teacher.firstName} {teacher.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {teacher.email}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          removeTeacherMutation.mutate({
                            sectionId: editingSection.id,
                            teacherId: teacher.id,
                          })
                        }
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No hay profesores asignados a esta sección
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Para asignar nuevos profesores, use la gestión de usuarios y asigne
              el rol de profesor con esta sección específica.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTeachersDialog(false);
                setEditingSection(null);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar sección académica"
        description="¿Estás seguro de eliminar esta sección?"
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
