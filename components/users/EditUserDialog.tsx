"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/lib/services/users.service";
import { rolesService } from "@/lib/services/roles.service";
import { User, UserRole } from "@/lib/types";
import { usePermissions } from "@/hooks/use-permissions";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.RECTOR]: "Rector",
  [UserRole.VICERRECTOR]: "Vicerrector",
  [UserRole.COORDINADOR]: "Coordinador",
  [UserRole.PROFESOR]: "Profesor",
  [UserRole.SECRETARIO]: "Secretario",
  [UserRole.PADRE]: "Padre",
  [UserRole.ESTUDIANTE]: "Estudiante",
  [UserRole.MODERADOR]: "Moderador",
  [UserRole.ADMIN]: "Administrador",
  [UserRole.USER]: "Usuario",
};

interface EditUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManageRoles = hasPermission("roles.manage");
  const [selectedCatalogRole, setSelectedCatalogRole] = useState("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);

  const catalogRolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: rolesService.getAll,
    enabled: canManageRoles && open,
  });

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    password: "",
  });

  useEffect(() => {
    setFormData({ name: user.name, email: user.email, role: user.role, password: "" });
    setCurrentUser(user);
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const payload: Record<string, string> = {
        name: data.name,
        email: data.email,
        role: data.role,
      };
      if (data.password.trim()) payload.password = data.password;
      return usersService.update(user.id, payload);
    },
    onSuccess: () => {
      toast.success("Usuario actualizado");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Error al actualizar usuario";
      toast.error(message);
    },
  });

  const assignedRoleKeys = new Set(currentUser.catalogRoles?.map((role) => role.key) ?? currentUser.roles ?? []);
  const activeCatalogRoles = (catalogRolesQuery.data ?? []).filter((role) => role.isActive);
  const assignedCatalogRoles = activeCatalogRoles.filter((role) => assignedRoleKeys.has(role.key));
  const assignMutation = useMutation({
    mutationFn: (roleId: number) => usersService.assignRole(user.id, roleId),
    onSuccess: (updatedUser) => {
      setCurrentUser(updatedUser);
      setSelectedCatalogRole("");
      setAssignmentError(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      toast.success("Rol asignado");
    },
    onError: (error: unknown) => setAssignmentError(errorMessage(error, "Error al asignar rol")),
  });
  const unassignMutation = useMutation({
    mutationFn: (roleId: number) => usersService.unassignRole(user.id, roleId),
    onSuccess: (updatedUser) => {
      setCurrentUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      toast.success("Rol quitado");
    },
    onError: (error: unknown) => setAssignmentError(errorMessage(error, "Error al quitar rol")),
  });

  const handleAssign = () => {
    const roleId = Number(selectedCatalogRole);
    const role = activeCatalogRoles.find((candidate) => candidate.id === roleId);
    if (!role || assignedRoleKeys.has(role.key)) {
      setAssignmentError("Seleccioná un rol válido");
      return;
    }
    assignMutation.mutate(roleId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Nombre y email son requeridos");
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>Actualiza los datos de {user.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {canManageRoles && (
            <div className="space-y-3 border-t pt-4" aria-labelledby="catalog-roles-heading">
              <div>
                <h3 id="catalog-roles-heading" className="font-medium">Roles de catálogo</h3>
                <p className="text-sm text-muted-foreground">Asignaciones actuales y roles activos disponibles.</p>
              </div>
              {assignmentError && <p role="alert" className="text-sm text-destructive">{assignmentError}</p>}
              <div className="flex flex-wrap gap-2">
                {assignedCatalogRoles.length ? assignedCatalogRoles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                    <span>{role.label}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => unassignMutation.mutate(role.id)} disabled={unassignMutation.isPending}>
                      Quitar {role.label}
                    </Button>
                  </div>
                )) : <span className="text-sm text-muted-foreground">Sin asignaciones</span>}
              </div>
              <div className="flex gap-2">
                <Label htmlFor="catalog-role-select" className="sr-only">Rol de catálogo</Label>
                <select
                  id="catalog-role-select"
                  aria-label="Rol de catálogo"
                  value={selectedCatalogRole}
                  onChange={(event) => setSelectedCatalogRole(event.target.value)}
                  className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm"
                >
                  <option value="">Seleccionar rol</option>
                  {activeCatalogRoles.filter((role) => !assignedRoleKeys.has(role.key)).map((role) => (
                    <option key={role.id} value={role.id}>{role.label}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={handleAssign} disabled={assignMutation.isPending}>
                  {assignMutation.isPending ? "Asignando..." : "Asignar rol"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
            >
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(UserRole).map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">
              Contraseña{" "}
              <span className="text-muted-foreground text-xs">(dejar en blanco para no cambiar)</span>
            </Label>
            <Input
              id="edit-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
    (error instanceof Error ? error.message : fallback);
}
