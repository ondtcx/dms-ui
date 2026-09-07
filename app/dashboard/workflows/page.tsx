"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Power, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { workflowsService } from "@/lib/services/workflows.service";
import { workflowErrorMessage } from "@/lib/types/workflows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function WorkflowsPage() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState("");
  const [stages, setStages] = useState([{ order: 1, roleKey: "" }]);
  const definitionsQuery = useQuery({ queryKey: ["workflow-definitions"], queryFn: workflowsService.getDefinitions, enabled: hasPermission("workflow.templates.manage") });
  const createMutation = useMutation({
    mutationFn: () => workflowsService.createDefinition({ name: name.trim(), description: description.trim() || undefined, stages, allowedInitiatorRoles: roles.split(",").map((role) => role.trim()).filter(Boolean) }),
    onSuccess: () => { setName(""); setDescription(""); setRoles(""); setStages([{ order: 1, roleKey: "" }]); queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] }); toast.success("Definición creada"); },
    onError: (error) => toast.error(workflowErrorMessage(error)),
  });
  const activateMutation = useMutation({ mutationFn: workflowsService.activate, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] }); toast.success("Versión activada"); }, onError: (error) => toast.error(workflowErrorMessage(error)) });

  if (!hasPermission("workflow.templates.manage")) return <p className="text-muted-foreground">No tienes permiso para administrar workflows.</p>;
  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-3xl font-bold">Workflows</h1><p className="text-muted-foreground">Administra definiciones secuenciales y sus versiones.</p></div>
    <Card><CardHeader><CardTitle>Nueva definición</CardTitle></CardHeader><CardContent className="space-y-4">
      <Input placeholder="Nombre de la definición" value={name} onChange={(event) => setName(event.target.value)} />
      <Textarea placeholder="Descripción (opcional)" value={description} onChange={(event) => setDescription(event.target.value)} />
      <Input placeholder="Roles que pueden iniciar, separados por coma" value={roles} onChange={(event) => setRoles(event.target.value)} />
      <div className="space-y-2"><p className="text-sm font-medium">Etapas secuenciales</p>{stages.map((stage, index) => <div className="flex gap-2" key={stage.order}><Input type="number" min={1} className="w-24" value={stage.order} onChange={(event) => setStages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, order: Number(event.target.value) } : item))} /><Input placeholder="Clave del rol" value={stage.roleKey} onChange={(event) => setStages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, roleKey: event.target.value } : item))} />{stages.length > 1 && <Button variant="ghost" size="icon" onClick={() => setStages((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>}</div>)}<Button variant="outline" onClick={() => setStages((current) => [...current, { order: current.length + 1, roleKey: "" }])}><Plus className="mr-2 h-4 w-4" />Agregar etapa</Button></div>
      <Button disabled={!name.trim() || stages.some((stage) => !stage.roleKey.trim()) || createMutation.isPending} onClick={() => createMutation.mutate()}>Crear definición</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Definiciones existentes</CardTitle></CardHeader><CardContent className="space-y-3">{definitionsQuery.isLoading ? <p>Cargando definiciones...</p> : definitionsQuery.data?.map((definition) => { const latest = definition.versions[definition.versions.length - 1]; return <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3" key={definition.id}><div><p className="font-medium">{definition.name}</p><p className="text-sm text-muted-foreground">Versión {latest?.version ?? "sin versión"} · {definition.isActive ? "Activa" : "Inactiva"}</p></div><Button variant="outline" disabled={activateMutation.isPending} onClick={() => activateMutation.mutate(definition.id)}><Power className="mr-2 h-4 w-4" />Activar última versión</Button></div>; })}</CardContent></Card>
  </div>;
}
