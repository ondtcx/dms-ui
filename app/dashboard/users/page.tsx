"use client";

import ProtectedRoute from "@/guards/ProtectedRoute";
import { UserRole, User } from "@/lib/types";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/lib/services/users.service";
import { useState } from "react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Users, UserPlus, Pencil, Trash2, KeyRound, Copy, Check, Loader2 } from "lucide-react";

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

const ROLE_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  admin: "destructive",
  rector: "destructive",
  vicerrector: "destructive",
  coordinador: "default",
  moderador: "default",
  profesor: "secondary",
  secretario: "secondary",
  padre: "outline",
  estudiante: "outline",
  user: "outline",
};

function UsersManagementContent() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: UserRole.PROFESOR,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado exitosamente");
      setIsCreating(false);
      setNewUser({ name: "", email: "", password: "", role: UserRole.PROFESOR });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Error al crear usuario";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar usuario");
    },
  });

  // Token generation state
  const [tokenDialogUser, setTokenDialogUser] = useState<{ id: string; name: string } | null>(null);
  const [generatedToken, setGeneratedToken] = useState<{ token: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateTokenMutation = useMutation({
    mutationFn: usersService.generateResetToken,
    onSuccess: (data) => {
      setGeneratedToken(data);
      toast.success("Token generado exitosamente");
    },
    onError: () => {
      toast.error("Error al generar el token");
    },
  });

  const handleGenerateToken = (user: User) => {
    setTokenDialogUser({ id: user.id, name: user.name });
    setGeneratedToken(null);
    setCopied(false);
    generateTokenMutation.mutate(user.id);
  };

  const handleCopyToken = async () => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken.token);
      setCopied(true);
      toast.success("Token copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error al copiar el token");
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const date = new Date(expiresAt);
    return date.toLocaleString("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newUser);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="text-sm text-muted-foreground">
              Administra los usuarios del sistema
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Crear usuario
        </Button>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del sistema</CardTitle>
          <CardDescription>
            {users ? `${users.length} usuarios registrados` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !users?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay usuarios registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ROLE_BADGE_VARIANT[user.role] ?? "outline"
                        }
                        className="capitalize"
                      >
                        {ROLE_LABELS[user.role as UserRole] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateToken(user)}
                          title="Generar token de restablecimiento"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(user.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear usuario */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nombre</Label>
              <Input
                id="new-name"
                required
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Rol</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) =>
                  setNewUser({ ...newUser, role: v as UserRole })
                }
              >
                <SelectTrigger id="new-role">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creando..." : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm eliminar */}
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar usuario"
        description="¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirmId !== null) deleteMutation.mutate(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
      />

      {/* Dialog editar usuario */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}

      {/* Dialog token de restablecimiento */}
      <Dialog
        open={tokenDialogUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTokenDialogUser(null);
            setGeneratedToken(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Token de restablecimiento</DialogTitle>
            <DialogDescription>
              Token generado para {tokenDialogUser?.name}
            </DialogDescription>
          </DialogHeader>

          {generateTokenMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : generatedToken ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Token</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedToken.token}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyToken}
                    title="Copiar al portapapeles"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Expira:</strong> {formatExpiry(generatedToken.expiresAt)}
                </p>
                <p className="mt-1">
                  Este token solo se muestra una vez. Copialo y compártelo de
                  forma segura con el usuario.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-destructive">
              No se pudo generar el token. Intenta nuevamente.
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setTokenDialogUser(null);
                setGeneratedToken(null);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>
      <UsersManagementContent />
    </ProtectedRoute>
  );
}
