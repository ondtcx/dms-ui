"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { GitBranch, Plus, Power, Save, Trash2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { workflowsService } from "@/lib/services/workflows.service";
import {
  type WorkflowDefinitionDetail,
  type WorkflowDefinitionVersion,
  type WorkflowStage,
  workflowErrorMessage,
} from "@/lib/types/workflows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function orderedStages(stages: WorkflowStage[]) {
  return [...stages].sort((left, right) => left.order - right.order);
}

function stagePath(stages: WorkflowStage[]) {
  return orderedStages(stages)
    .map((stage) => `${stage.order}. ${stage.roleKey}`)
    .join(" → ");
}

function versionLabel(version: WorkflowDefinitionVersion) {
  return `Versión ${version.version}`;
}

export default function WorkflowAdministration() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const canManage = hasPermission("workflow.templates.manage");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editorStages, setEditorStages] = useState<WorkflowStage[]>([]);
  const [validationVersionId, setValidationVersionId] = useState<number | null>(
    null,
  );
  const [validation, setValidation] = useState<{
    valid: boolean;
    issues: { path: string; message: string }[];
  } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState("");
  const versionSubmissionInFlight = useRef(false);
  const [stages, setStages] = useState<WorkflowStage[]>([
    { order: 1, roleKey: "" },
  ]);

  const definitionsQuery = useQuery({
    queryKey: ["workflow-definitions"],
    queryFn: workflowsService.getDefinitions,
    enabled: canManage,
  });
  const detailQuery = useQuery({
    queryKey: ["workflow-definition", selectedId],
    queryFn: () => workflowsService.getDefinition(selectedId as number),
    enabled: canManage && selectedId !== null,
  });

  useEffect(() => {
    if (selectedId === null && definitionsQuery.data?.length) {
      setSelectedId(definitionsQuery.data[0].id);
    }
  }, [definitionsQuery.data, selectedId]);

  const createMutation = useMutation({
    mutationFn: () =>
      workflowsService.createDefinition({
        name: name.trim(),
        description: description.trim() || undefined,
        stages,
        allowedInitiatorRoles: roles
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setRoles("");
      setStages([{ order: 1, roleKey: "" }]);
      queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
      toast.success("Definición creada");
    },
    onError: (error) => toast.error(workflowErrorMessage(error)),
  });
  const versionMutation = useMutation({
    mutationFn: () =>
      workflowsService.createVersion(selectedId as number, {
        baseVersionId: editingVersion as number,
        stages: editorStages,
      }),
    onSuccess: () => {
      versionSubmissionInFlight.current = false;
      setEditingVersion(null);
      setValidation(null);
      queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
      queryClient.invalidateQueries({
        queryKey: ["workflow-definition", selectedId],
      });
      toast.success("Nueva versión creada");
    },
    onError: (error) => {
      versionSubmissionInFlight.current = false;
      toast.error(workflowErrorMessage(error));
    },
  });
  const validateMutation = useMutation({
    mutationFn: (versionId: number) =>
      workflowsService.validate(selectedId as number, versionId),
    onSuccess: (result) => {
      setValidationVersionId(result.versionId);
      setValidation(result);
    },
    onError: (error) => toast.error(workflowErrorMessage(error)),
  });
  const lifecycleMutation = useMutation({
    mutationFn: ({
      versionId,
      active,
    }: {
      versionId: number;
      active: boolean;
    }) =>
      active
        ? workflowsService.activate(selectedId as number, versionId)
        : workflowsService.deactivate(selectedId as number, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-definitions"] });
      queryClient.invalidateQueries({
        queryKey: ["workflow-definition", selectedId],
      });
      toast.success("Estado de la versión actualizado");
    },
    onError: (error) => toast.error(workflowErrorMessage(error)),
  });

  const detail = detailQuery.data as WorkflowDefinitionDetail | undefined;
  const usage =
    detail?.usage ??
    (detail?.counts
      ? {
          executionCount: detail.counts.executions,
          activeCount: null,
        }
      : null);
  const selectedVersion = useMemo(
    () =>
      detail?.versions.find((version) => version.id === validationVersionId),
    [detail?.versions, validationVersionId],
  );
  const isMutating =
    createMutation.isPending ||
    versionMutation.isPending ||
    validateMutation.isPending ||
    lifecycleMutation.isPending;

  if (!canManage) {
    return (
      <p className="text-muted-foreground">
        No tienes permiso para administrar flujos de trabajo.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <GitBranch className="h-7 w-7" />
          Flujos de trabajo
        </h1>
        <p className="mt-2 text-muted-foreground">
          Administra definiciones, versiones, etapas y su ciclo de vida.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nueva definición</CardTitle>
          <CardDescription>
            Crea una secuencia de etapas para nuevos documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            aria-label="Nombre de la definición"
            placeholder="Nombre de la definición"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Textarea
            aria-label="Descripción de la definición"
            placeholder="Descripción y propósito del flujo de trabajo"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Input
            aria-label="Roles iniciadores"
            placeholder="Roles que pueden iniciar, separados por coma"
            value={roles}
            onChange={(event) => setRoles(event.target.value)}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Etapas de aprobación</p>
            {stages.map((stage, index) => (
              <div className="flex gap-2" key={`${stage.order}-${index}`}>
                <Input
                  aria-label={`Orden de etapa ${index + 1}`}
                  type="number"
                  min={1}
                  value={stage.order}
                  onChange={(event) =>
                    setStages((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, order: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <Input
                  aria-label={`Rol de etapa ${index + 1}`}
                  placeholder="Clave del rol"
                  value={stage.roleKey}
                  onChange={(event) =>
                    setStages((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, roleKey: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                {stages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar etapa"
                    onClick={() =>
                      setStages((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setStages((current) => [
                  ...current,
                  { order: current.length + 1, roleKey: "" },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Agregar etapa
            </Button>
          </div>
          <Button
            disabled={
              isMutating ||
              !name.trim() ||
              stages.some((stage) => !stage.roleKey.trim())
            }
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creando..." : "Crear definición"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Definiciones existentes</CardTitle>
          <CardDescription>
            Selecciona una definición para consultar su detalle y administrar
            una versión explícita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {definitionsQuery.isLoading ? (
            <p>Cargando definiciones...</p>
          ) : definitionsQuery.isError ? (
            <p role="alert" className="text-destructive">
              No se pudieron cargar las definiciones. Intenta nuevamente.
            </p>
          ) : definitionsQuery.data?.length === 0 ? (
            <p>
              Todavía no hay definiciones. Crea la primera para empezar a usar
              flujos de trabajo.
            </p>
          ) : (
            definitionsQuery.data?.map((definition) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border p-4"
                key={definition.id}
              >
                <div>
                  <p className="font-medium">{definition.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {definition.versions.length} versión(es)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedId(definition.id)}
                >
                  Ver detalle
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {selectedId !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de la definición</CardTitle>
          </CardHeader>
          <CardContent>
            {detailQuery.isLoading ? (
              <p>Cargando detalle...</p>
            ) : detailQuery.isError ? (
              <p role="alert" className="text-destructive">
                No se pudo cargar el detalle. Intenta nuevamente.
              </p>
            ) : !detail ? (
              <p>No hay detalle disponible para esta definición.</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold">{detail.name}</h2>
                  {detail.description && (
                    <p className="text-sm text-muted-foreground">
                      {detail.description}
                    </p>
                  )}
                  <Badge variant={detail.isActive ? "default" : "secondary"}>
                    {detail.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                {usage ? (
                  <p className="text-sm text-muted-foreground">
                    Uso: {usage.executionCount ?? "No disponible"} ejecuciones ·{" "}
                    {usage.activeCount ?? "No disponible"} activas
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Uso e historial no disponibles para esta definición.
                  </p>
                )}
                {detail.versions.length === 0 ? (
                  <p>No hay versiones disponibles para esta definición.</p>
                ) : (
                  <div className="space-y-3">
                    {[...detail.versions]
                      .sort((left, right) => left.version - right.version)
                      .map((version) => (
                        <div
                          className="space-y-2 rounded border p-3"
                          key={version.id}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{versionLabel(version)}</strong>
                            <Badge
                              variant={
                                version.isActive ? "default" : "secondary"
                              }
                            >
                              {version.isActive ? "Activa" : "Inactiva"}
                            </Badge>
                            {version.executionCount !== undefined && (
                              <span className="text-sm text-muted-foreground">
                                {version.executionCount ?? "No disponible"}{" "}
                                ejecuciones
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Ruta: {stagePath(version.stages)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              disabled={isMutating}
                              onClick={() => {
                                setValidationVersionId(version.id);
                                validateMutation.mutate(version.id);
                              }}
                            >
                              {validateMutation.isPending &&
                              validationVersionId === version.id
                                ? "Validando..."
                                : "Validar versión"}
                            </Button>
                            {version.isActive ? (
                              <Button
                                variant="outline"
                                disabled={isMutating}
                                onClick={() =>
                                  lifecycleMutation.mutate({
                                    versionId: version.id,
                                    active: false,
                                  })
                                }
                              >
                                <Power className="h-4 w-4" />
                                Desactivar
                              </Button>
                            ) : (
                              <Button
                                disabled={
                                  isMutating ||
                                  validationVersionId !== version.id ||
                                  !validation?.valid
                                }
                                onClick={() =>
                                  lifecycleMutation.mutate({
                                    versionId: version.id,
                                    active: true,
                                  })
                                }
                              >
                                <Power className="h-4 w-4" />
                                Activar versión
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              disabled={isMutating}
                              onClick={() => {
                                setEditingVersion(version.id);
                                setEditorStages(orderedStages(version.stages));
                              }}
                            >
                              Editar como nueva versión
                            </Button>
                          </div>
                          {validationVersionId === version.id && validation && (
                            <div
                              role={validation.valid ? "status" : "alert"}
                              className="text-sm"
                            >
                              {validation.valid
                                ? "La versión es válida y puede activarse."
                                : validation.issues
                                    .map(
                                      (issue) =>
                                        `${issue.path}: ${issue.message}`,
                                    )
                                    .join("; ")}
                            </div>
                          )}
                          {editingVersion === version.id && (
                            <div className="space-y-2 border-t pt-3">
                              <p className="text-sm font-medium">
                                Nueva versión basada en {versionLabel(version)}
                              </p>
                              {editorStages.map((stage, index) => (
                                <Input
                                  aria-label={`Rol de nueva etapa ${index + 1}`}
                                  key={`${stage.order}-${index}`}
                                  value={stage.roleKey}
                                  onChange={(event) =>
                                    setEditorStages((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              roleKey: event.target.value,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              ))}
                              <Button
                                disabled={
                                  isMutating ||
                                  !editorStages.length ||
                                  editorStages.some(
                                    (stage) => !stage.roleKey.trim(),
                                  )
                                }
                                onClick={() => {
                                  if (versionSubmissionInFlight.current) return;
                                  versionSubmissionInFlight.current = true;
                                  versionMutation.mutate();
                                }}
                              >
                                <Save className="h-4 w-4" />
                                {versionMutation.isPending
                                  ? "Guardando..."
                                  : "Guardar nueva versión"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
                {detail.history?.length ? (
                  <div>
                    <h3 className="font-medium">
                      Historial de ejecuciones (solo lectura)
                    </h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {detail.history.map((execution) => (
                        <li key={execution.id}>
                          {execution.status} ·{" "}
                          {execution.currentState ?? "Estado no disponible"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    El historial no está disponible para esta definición.
                  </p>
                )}
                {selectedVersion && (
                  <span className="sr-only">
                    Versión seleccionada {selectedVersion.version}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
