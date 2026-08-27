"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rolesService } from "@/lib/services/roles.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function RolesManagement() {
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const { data: roles = [], isLoading } = useQuery({ queryKey: ["roles"], queryFn: rolesService.getAll });
  const create = useMutation({
    mutationFn: () => rolesService.create({ key, label }),
    onSuccess: () => { setKey(""); setLabel(""); client.invalidateQueries({ queryKey: ["roles"] }); },
  });

  return (
    <section className="space-y-4" aria-labelledby="roles-heading">
      <h2 id="roles-heading" className="text-xl font-semibold">Roles y permisos</h2>
      <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <Input aria-label="Clave del rol" placeholder="Clave" value={key} onChange={(event) => setKey(event.target.value)} required />
        <Input aria-label="Nombre del rol" placeholder="Nombre" value={label} onChange={(event) => setLabel(event.target.value)} required />
        <Button type="submit" disabled={create.isPending}>Crear rol</Button>
      </form>
      {isLoading ? <p>Cargando roles...</p> : <ul className="space-y-2">{roles.map((role) => <li key={role.id} className="rounded border p-3"><strong>{role.label}</strong> <span className="text-muted-foreground">({role.key})</span></li>)}</ul>}
    </section>
  );
}
