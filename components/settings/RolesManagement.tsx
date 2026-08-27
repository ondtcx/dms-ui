"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/use-permissions";
import { permissionsService } from "@/lib/services/permissions.service";
import { Role, rolesService } from "@/lib/services/roles.service";

type FormState = { key: string; label: string; permissionKeys: string[] };
const EMPTY_FORM: FormState = { key: "", label: "", permissionKeys: [] };

function rolePermissionKeys(role: Role): string[] {
  return (role.permissions ?? []).map((permission) => permission.key ?? permission.permission?.key).filter((key): key is string => Boolean(key));
}

function rolePermissionLabels(role: Role): string[] {
  return (role.permissions ?? []).map((permission) => permission.label ?? permission.permission?.label).filter((label): label is string => Boolean(label));
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
  const [error, setError] = useState<string | null>(null);
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesService.getAll });
  const permissionsQuery = useQuery({ queryKey: ["permission-catalog"], queryFn: permissionsService.getCatalog });
  const refresh = () => client.invalidateQueries({ queryKey: ["roles"] });
  const invalidate = () => { setError(null); setForm(EMPTY_FORM); setEditingId(null); refresh(); };
  const create = useMutation({
    mutationFn: () => rolesService.create({ key: form.key, label: form.label, ...(form.permissionKeys.length ? { permissionKeys: form.permissionKeys } : {}) }),
    onSuccess: invalidate,
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });
  const update = useMutation({
    mutationFn: (input: { id: number; data: Parameters<typeof rolesService.update>[1] }) => rolesService.update(input.id, input.data),
    onSuccess: invalidate,
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });
  const deactivate = useMutation({
    mutationFn: (id: number) => rolesService.deactivate(id),
    onSuccess: invalidate,
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  if (!hasPermission("roles.manage")) return null;
  const roles = rolesQuery.data ?? [];
  const permissions = (permissionsQuery.data ?? []).filter((permission) => permission.isActive);
  const pending = create.isPending || update.isPending || deactivate.isPending;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (editingId === null) create.mutate();
    else update.mutate({ id: editingId, data: { label: form.label, permissionKeys: form.permissionKeys } });
  };
  const edit = (role: Role) => setForm({ key: role.key, label: role.label, permissionKeys: rolePermissionKeys(role) });

  return (
    <section className="space-y-4" aria-labelledby="roles-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="roles-heading" className="text-xl font-semibold">Roles y permisos</h2>
        <Button type="button" variant="outline" onClick={refresh} disabled={rolesQuery.isFetching}>Actualizar</Button>
      </div>
      {(error || rolesQuery.error || permissionsQuery.error) && <p role="alert" className="text-sm text-destructive">{error || errorMessage(rolesQuery.error || permissionsQuery.error)}</p>}
      <form className="space-y-3 rounded border p-4" onSubmit={submit}>
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Clave del rol" placeholder="Clave" value={form.key} readOnly={editingId !== null} onChange={(event) => setForm({ ...form, key: event.target.value })} required />
          <Input aria-label="Nombre del rol" placeholder="Nombre" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
          <Button type="submit" disabled={pending}>{editingId === null ? "Crear rol" : "Guardar cambios"}</Button>
          {editingId !== null && <Button type="button" variant="outline" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }}>Cancelar</Button>}
        </div>
        <fieldset>
          <legend className="font-medium">Permisos activos</legend>
          {permissionsQuery.isLoading ? <p>Cargando permisos...</p> : permissions.map((permission) => (
            <label key={permission.id} className="mr-4 inline-flex items-center gap-2">
              <input type="checkbox" aria-label={permission.label} checked={form.permissionKeys.includes(permission.key)} onChange={(event) => setForm({ ...form, permissionKeys: event.target.checked ? [...form.permissionKeys, permission.key] : form.permissionKeys.filter((key) => key !== permission.key) })} />
              {permission.label}
            </label>
          ))}
        </fieldset>
      </form>
      {rolesQuery.isLoading ? <p>Cargando roles...</p> : (
        <ul className="space-y-2">
          {roles.map((role) => (
            <li key={role.id} className="rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><strong>{role.label}</strong> <span className="text-muted-foreground">({role.key})</span> <span>{role.isActive ? "Activo" : "Inactivo"}</span></div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" aria-label={`Editar ${role.label}`} onClick={() => { setEditingId(role.id); edit(role); }}>Editar</Button>
                  {role.isActive ? <Button type="button" variant="outline" size="sm" aria-label={`Desactivar ${role.label}`} onClick={() => deactivate.mutate(role.id)} disabled={pending}>Desactivar</Button> : <Button type="button" variant="outline" size="sm" aria-label={`Activar ${role.label}`} onClick={() => update.mutate({ id: role.id, data: { isActive: true } })} disabled={pending}>Activar</Button>}
                </div>
              </div>
              <p className="text-sm">Permisos: {rolePermissionLabels(role).join(", ") || "Ninguno"}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
