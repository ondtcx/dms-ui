"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  departmentsService,
  type Department,
} from "@/lib/services/departments.service";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Users,
  BookOpen,
  UserPlus,
  UserMinus,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersService } from "@/lib/services/users.service";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Iconos disponibles para departamentos
const AVAILABLE_ICONS = [
  { value: "Building2", label: "Edificio" },
  { value: "Users", label: "Usuarios" },
  { value: "BookOpen", label: "Libro Abierto" },
  { value: "GraduationCap", label: "Birrete" },
  { value: "FileText", label: "Documento" },
  { value: "Briefcase", label: "Maletín" },
  { value: "ClipboardList", label: "Lista" },
  { value: "Settings", label: "Configuración" },
];

// Colores predefinidos
const AVAILABLE_COLORS = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Naranja" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#14b8a6", label: "Turquesa" },
  { value: "#f97316", label: "Naranja Intenso" },
  { value: "#6366f1", label: "Índigo" },
];

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [usersDepartment, setUsersDepartment] = useState<Department | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    color: "#3b82f6",
    icon: "Building2",
    isActive: true,
  });

  // Queries
  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments", searchTerm],
    queryFn: () =>
      departmentsService.getAll({
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ["department-stats"],
    queryFn: () => departmentsService.getStats(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: departmentsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-stats"] });
      toast.success("Departamento creado exitosamente");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Error al crear departamento",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      departmentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-stats"] });
      toast.success("Departamento actualizado exitosamente");
      setShowEditDialog(false);
      setEditingDepartment(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Error al actualizar departamento",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: departmentsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-stats"] });
      toast.success("Departamento eliminado exitosamente");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Error al eliminar departamento",
      );
    },
  });

  // Department users queries
  const { data: departmentUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["department-users", usersDepartment?.id],
    queryFn: () => departmentsService.getUsers(usersDepartment!.id),
    enabled: !!usersDepartment,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["users-for-selection"],
    queryFn: () => usersService.getAllForSelection(),
    enabled: showUsersDialog,
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ departmentId, userId }: { departmentId: number; userId: string }) =>
      departmentsService.assignUser(departmentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-users", usersDepartment?.id] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-stats"] });
      toast.success("Usuario asignado al departamento");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al asignar usuario");
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ departmentId, userId }: { departmentId: number; userId: string }) =>
      departmentsService.removeUser(departmentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-users", usersDepartment?.id] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-stats"] });
      toast.success("Usuario removido del departamento");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al remover usuario");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      departmentsService.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-stats"] });
      toast.success("Estado actualizado exitosamente");
    },
    onError: () => {
      toast.error("Error al actualizar estado");
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      color: "#3b82f6",
      icon: "Building2",
      isActive: true,
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("El código es requerido");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || "",
      color: department.color || "#3b82f6",
      icon: department.icon || "Building2",
      isActive: department.isActive,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim() || !editingDepartment) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("El código es requerido");
      return;
    }
    updateMutation.mutate({ id: editingDepartment.id, data: formData });
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const handleManageUsers = (department: Department) => {
    setUsersDepartment(department);
    setUserSearchTerm("");
    setShowUsersDialog(true);
  };

  const availableUsers = (allUsers || []).filter((u) => {
    const alreadyAssigned = (departmentUsers || []).some((du) => du.id === u.id);
    if (alreadyAssigned) return false;
    if (!userSearchTerm) return true;
    return (
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Departamentos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los departamentos de tu institución educativa
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Activos</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {stats.active}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inactivos</CardDescription>
              <CardTitle className="text-2xl text-gray-400">
                {stats.inactive}
              </CardTitle>
            </CardHeader>
          </Card>
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
                placeholder="Buscar departamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Botón nuevo departamento */}
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Departamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de departamentos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : departments?.data?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay departamentos</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primer departamento para comenzar
            </p>
          </div>
        ) : (
          departments?.data?.map((department) => (
            <Card
              key={department.id}
              className="hover:shadow-lg transition-shadow"
              style={{ borderLeft: `4px solid ${department.color}` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${department.color}20`,
                        }}
                      >
                        <Building2
                          className="h-4 w-4"
                          style={{ color: department.color }}
                        />
                      </span>
                      {department.name}
                    </CardTitle>
                    <div className="mt-1 ml-10">
                      <Badge variant="outline" className="text-xs">
                        {department.code}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {department.description || "Sin descripción"}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleToggleActive(department.id, department.isActive)
                    }
                    title={department.isActive ? "Desactivar" : "Activar"}
                  >
                    {department.isActive ? (
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
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {department._count?.users || 0} usuario(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {department._count?.courses || 0} curso(s)
                    </span>
                  </div>
                  <Badge
                    variant={department.isActive ? "default" : "secondary"}
                    style={
                      department.isActive
                        ? { backgroundColor: department.color }
                        : undefined
                    }
                  >
                    {department.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleManageUsers(department)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Usuarios
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(department)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDelete(department.id, department.name)
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

      {/* Dialog Crear Departamento */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Departamento</DialogTitle>
            <DialogDescription>
              Los departamentos representan las áreas organizativas de tu
              institución
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Dirección Académica"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Ej: ACA"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Solo letras mayúsculas, números y guiones
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del departamento (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) =>
                    setFormData({ ...formData, color: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icono</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Departamento activo
              </label>
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
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creando..." : "Crear Departamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Gestionar Usuarios */}
      <Dialog
        open={showUsersDialog}
        onOpenChange={(open) => {
          setShowUsersDialog(open);
          if (!open) {
            setUsersDepartment(null);
            setUserSearchTerm("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios de {usersDepartment?.name}
            </DialogTitle>
            <DialogDescription>
              Gestiona los usuarios asignados a este departamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current users */}
            <div>
              <Label className="text-sm font-medium">
                Miembros actuales ({departmentUsers?.length || 0})
              </Label>
              <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border">
                {isLoadingUsers ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Cargando usuarios...
                  </div>
                ) : !departmentUsers?.length ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay usuarios asignados
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {departmentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                              {user.role && (
                                <span> - {user.role}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            usersDepartment &&
                            removeUserMutation.mutate({
                              departmentId: usersDepartment.id,
                              userId: user.id,
                            })
                          }
                          disabled={removeUserMutation.isPending}
                          title="Remover del departamento"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Add users */}
            <div>
              <Label className="text-sm font-medium">Agregar usuario</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario por nombre o email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border">
                {availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {userSearchTerm
                      ? "No se encontraron usuarios"
                      : "Escribe para buscar usuarios"}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {availableUsers.slice(0, 10).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            usersDepartment &&
                            assignUserMutation.mutate({
                              departmentId: usersDepartment.id,
                              userId: user.id,
                            })
                          }
                          disabled={assignUserMutation.isPending}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          Agregar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUsersDialog(false);
                setUsersDepartment(null);
                setUserSearchTerm("");
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Departamento */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
            <DialogDescription>
              Modifica la información del departamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Dirección Académica"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-code">Código *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Ej: ACA"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Solo letras mayúsculas, números y guiones
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del departamento (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) =>
                    setFormData({ ...formData, color: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-icon">Icono</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <label htmlFor="edit-isActive" className="text-sm font-medium">
                Departamento activo
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingDepartment(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar departamento"
        description={`¿Estás seguro de eliminar el departamento "${deleteConfirm?.name}"?`}
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
