"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { permissionsService } from "@/lib/services/permissions.service";
import { Role, rolesService } from "@/lib/services/roles.service";
import type { Permission } from "@/lib/types";
import { cn } from "@/lib/utils";

type FormState = { key: string; label: string; permissionKeys: string[] };
const EMPTY_FORM: FormState = { key: "", label: "", permissionKeys: [] };

const PERMISSION_GROUP_LABELS: Record<string, string> = {
  users: "Usuarios",
  categories: "Categorías",
  "document-types": "Tipos de documento",
  templates: "Plantillas",
  roles: "Roles",
  documents: "Documentos",
  settings: "Configuración",
  workflow: "Flujos de trabajo",
};

const PERMISSION_GROUP_ORDER = Object.keys(PERMISSION_GROUP_LABELS);

function permissionGroup(key: string) {
  const prefix = key.split(".")[0] || "otros";
  const label =
    PERMISSION_GROUP_LABELS[prefix] ??
    prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/-/g, " ");
  return { key: prefix, label };
}

function rolePermissionKeys(role: Role): string[] {
  return (role.permissions ?? [])
    .map((permission) => permission.key ?? permission.permission?.key)
    .filter((key): key is string => Boolean(key));
}

function rolePermissionLabels(role: Role): string[] {
  return (role.permissions ?? [])
    .map((permission) => permission.label ?? permission.permission?.label)
    .filter((label): label is string => Boolean(label));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "No se pudo completar la operación";
}

export function RolesManagement() {
  const client = useQueryClient();
  const { hasPermission } = usePermissions();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesService.getAll });
  const permissionsQuery = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: permissionsService.getCatalog,
  });

  const refreshRoles = () => client.invalidateQueries({ queryKey: ["roles"] });
  const refreshAll = () => {
    void refreshRoles();
    void permissionsQuery.refetch();
  };
  const resetForm = () => {
    setError(null);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };
  const succeed = (message: string) => () => {
    resetForm();
    toast.success(message);
    refreshRoles();
  };

  const create = useMutation({
    mutationFn: () =>
      rolesService.create({
        key: form.key,
        label: form.label,
        ...(form.permissionKeys.length ? { permissionKeys: form.permissionKeys } : {}),
      }),
    onSuccess: succeed("Rol creado"),
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });
  const update = useMutation({
    mutationFn: (input: { id: number; data: Parameters<typeof rolesService.update>[1] }) =>
      rolesService.update(input.id, input.data),
    onSuccess: succeed("Rol actualizado"),
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });
  const deactivate = useMutation({
    mutationFn: (id: number) => rolesService.deactivate(id),
    onSuccess: succeed("Rol desactivado"),
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => rolesService.remove(id),
    onSuccess: () => {
      setDeleteCandidate(null);
      resetForm();
      toast.success("Rol eliminado");
      refreshRoles();
    },
    onError: (mutationError) => {
      setDeleteCandidate(null);
      setError(errorMessage(mutationError));
    },
  });

  if (!hasPermission("roles.manage")) return null;

  const roles = rolesQuery.data ?? [];
  const activeRoleCount = roles.filter((role) => role.isActive).length;
  const permissions = (permissionsQuery.data ?? []).filter((permission) => permission.isActive);
  const selectedCount = permissions.filter((permission) =>
    form.permissionKeys.includes(permission.key),
  ).length;
  const editingRole = roles.find((role) => role.id === editingId);
  const pending =
    create.isPending || update.isPending || deactivate.isPending || remove.isPending;

  const groups = permissions
    .reduce<Array<{ key: string; label: string; items: Permission[] }>>((result, permission) => {
      const group = permissionGroup(permission.key);
      const current = result.find((item) => item.key === group.key);
      if (current) current.items.push(permission);
      else result.push({ ...group, items: [permission] });
      return result;
    }, [])
    .sort((left, right) => {
      const leftIndex = PERMISSION_GROUP_ORDER.indexOf(left.key);
      const rightIndex = PERMISSION_GROUP_ORDER.indexOf(right.key);
      return (
        (leftIndex === -1 ? PERMISSION_GROUP_ORDER.length : leftIndex) -
        (rightIndex === -1 ? PERMISSION_GROUP_ORDER.length : rightIndex)
      );
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (editingId === null) create.mutate();
    else
      update.mutate({
        id: editingId,
        data: { label: form.label, permissionKeys: form.permissionKeys },
      });
  };

  const edit = (role: Role) => {
    setError(null);
    setEditingId(role.id);
    setForm({
      key: role.key,
      label: role.label,
      permissionKeys: rolePermissionKeys(role),
    });
    formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  };

  const togglePermission = (key: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      permissionKeys: checked
        ? [...new Set([...current.permissionKeys, key])]
        : current.permissionKeys.filter((item) => item !== key),
    }));
  };

  const selectAllPermissions = () =>
    setForm((current) => ({
      ...current,
      permissionKeys: permissions.map((permission) => permission.key),
    }));

  const queryError =
    error ||
    (rolesQuery.error ? errorMessage(rolesQuery.error) : null) ||
    (permissionsQuery.error ? errorMessage(permissionsQuery.error) : null);

  return (
    <section className="space-y-6" aria-labelledby="roles-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <h1 id="roles-heading" className="text-2xl font-bold tracking-tight">
              Roles y permisos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra los roles del catálogo y los permisos asignados a cada uno.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={rolesQuery.isFetching}
          className="self-start sm:mt-1"
        >
          <RefreshCw className={cn("h-4 w-4", rolesQuery.isFetching && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {queryError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{queryError}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Roles del catálogo</CardTitle>
            <CardDescription>
              {rolesQuery.isLoading
                ? "Cargando roles..."
                : `${roles.length} ${roles.length === 1 ? "rol" : "roles"} · ${activeRoleCount} ${
                    activeRoleCount === 1 ? "activo" : "activos"
                  }`}
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="xl:hidden"
                onClick={() =>
                  formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" })
                }
              >
                <Plus className="h-4 w-4" />
                Nuevo rol
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {rolesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
                <Users aria-hidden="true" className="mb-2 h-9 w-9 text-muted-foreground/40" />
                <p className="font-medium">No hay roles definidos</p>
                <p className="text-sm text-muted-foreground">
                  Crea el primer rol con el formulario.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Permisos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => {
                    const labels = rolePermissionLabels(role);
                    const visibleLabels = labels.slice(0, 2);
                    const hiddenLabels = labels.slice(2);
                    const assigned = role.assignmentCount ?? 0;
                    return (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="font-medium">{role.label}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {role.key}
                          </div>
                          {assigned > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {assigned} {assigned === 1 ? "usuario asignado" : "usuarios asignados"}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground md:hidden">
                            {labels.length === 0
                              ? "Sin permisos"
                              : `${labels.length} ${
                                  labels.length === 1 ? "permiso" : "permisos"
                                }`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("gap-1.5 font-normal", !role.isActive && "text-muted-foreground")}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-1.5 rounded-full",
                                role.isActive ? "bg-secondary" : "bg-muted-foreground/40",
                              )}
                            />
                            {role.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden max-w-md whitespace-normal md:table-cell">
                          {labels.length ? (
                            <div className="flex flex-wrap gap-1">
                              {visibleLabels.map((label, index) => (
                                <Badge
                                  key={`${role.id}-${label}-${index}`}
                                  variant="outline"
                                  className="font-normal"
                                >
                                  {label}
                                </Badge>
                              ))}
                              {hiddenLabels.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="font-normal text-muted-foreground"
                                  title={hiddenLabels.join(", ")}
                                  aria-label={`${hiddenLabels.length} permisos más: ${hiddenLabels.join(", ")}`}
                                >
                                  +{hiddenLabels.length}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin permisos</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${role.label}`}
                              title="Editar rol"
                              onClick={() => edit(role)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {role.isActive ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Desactivar ${role.label}`}
                                title="Desactivar rol"
                                onClick={() => deactivate.mutate(role.id)}
                                disabled={pending}
                              >
                                <PowerOff className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Activar ${role.label}`}
                                title="Activar rol"
                                onClick={() =>
                                  update.mutate({ id: role.id, data: { isActive: true } })
                                }
                                disabled={pending}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Eliminar ${role.label}`}
                              title={assigned > 0 ? "Tiene usuarios asignados" : "Eliminar rol"}
                              onClick={() => setDeleteCandidate(role)}
                              disabled={pending || assigned > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div ref={formRef}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingId === null ? (
                  <Plus aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Pencil aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                )}
                {editingId === null ? "Nuevo rol" : "Editar rol"}
              </CardTitle>
              <CardDescription>
                {editingRole ? `Editando ${editingRole.label}.` : "Crea un rol y selecciona sus permisos."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="role-key">Clave del rol</Label>
                  <Input
                    id="role-key"
                    aria-label="Clave del rol"
                    aria-describedby="role-key-help"
                    autoComplete="off"
                    className={cn("font-mono", editingId !== null && "bg-muted text-muted-foreground")}
                    placeholder="ej. coordinador"
                    value={form.key}
                    readOnly={editingId !== null}
                    onChange={(event) => setForm({ ...form, key: event.target.value })}
                    required
                  />
                  <p id="role-key-help" className="text-xs text-muted-foreground">
                    {editingId === null
                      ? "Identificador único. No se puede cambiar después."
                      : "La clave no se puede modificar."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-label">Nombre del rol</Label>
                  <Input
                    id="role-label"
                    aria-label="Nombre del rol"
                    placeholder="ej. Coordinador académico"
                    value={form.label}
                    onChange={(event) => setForm({ ...form, label: event.target.value })}
                    required
                  />
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Permisos</legend>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {selectedCount} de {permissions.length} seleccionados
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={selectAllPermissions}
                        disabled={!permissions.length || selectedCount === permissions.length}
                      >
                        Seleccionar todos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setForm((current) => ({ ...current, permissionKeys: [] }))
                        }
                        disabled={form.permissionKeys.length === 0}
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-[28rem] overflow-y-auto rounded-md border">
                    {permissionsQuery.isLoading ? (
                      <div className="space-y-2 p-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-5 w-full" />
                        ))}
                      </div>
                    ) : permissions.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">
                        No hay permisos activos en el catálogo.
                      </p>
                    ) : (
                      groups.map((group) => {
                        const groupSelected = group.items.filter((permission) =>
                          form.permissionKeys.includes(permission.key),
                        ).length;
                        return (
                          <div key={group.key} className="border-b p-3 last:border-b-0">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {group.label}
                              </h2>
                              <span className="text-xs text-muted-foreground">
                                {groupSelected}/{group.items.length}
                              </span>
                            </div>
                            <div className="grid gap-2">
                              {group.items.map((permission) => (
                                <div key={permission.id} className="flex items-start gap-2">
                                  <Checkbox
                                    id={`permission-${permission.id}`}
                                    aria-label={permission.label}
                                    checked={form.permissionKeys.includes(permission.key)}
                                    onCheckedChange={(checked) =>
                                      togglePermission(permission.key, checked === true)
                                    }
                                    className="mt-0.5"
                                  />
                                  <Label
                                    htmlFor={`permission-${permission.id}`}
                                    className="cursor-pointer items-start text-sm font-normal leading-5"
                                  >
                                    {permission.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </fieldset>

                <div className="flex items-center justify-end gap-2 border-t pt-4">
                  {editingId !== null && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={pending}>
                    {editingId === null ? (
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Save aria-hidden="true" className="h-4 w-4" />
                    )}
                    {editingId === null ? "Crear rol" : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
        title="Eliminar rol"
        description={
          deleteCandidate
            ? `Se eliminará permanentemente el rol "${deleteCandidate.label}". Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (deleteCandidate) remove.mutate(deleteCandidate.id);
        }}
      />
    </section>
  );
}
