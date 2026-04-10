"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/lib/services/users.service";
import { User, UserRole } from "@/lib/types";
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

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    password: "",
  });

  useEffect(() => {
    setFormData({ name: user.name, email: user.email, role: user.role, password: "" });
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
