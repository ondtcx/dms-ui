"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { documentsService } from "@/lib/services/documents.service";
import type { DocumentVersion, VersionRetentionUpdate } from "@/lib/types";

export function retentionDateToISO(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getTime() <= Date.now()) return null;
  return date.toISOString();
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es-ES");
}

export function VersionRetentionControls({ documentId, version, isCurrent }: {
  documentId: number;
  version: DocumentVersion;
  isCurrent: boolean;
}) {
  const client = useQueryClient();
  const id = useId();
  const [selectedDate, setSelectedDate] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(false);
  const context = useRef(`${documentId}:${version.version}`);
  context.current = `${documentId}:${version.version}`;
  useEffect(() => {
    setSelectedDate("");
    setError("");
  }, [documentId, version.version]);

  const mutation = useMutation({
    mutationFn: (request: { documentId: number; version: number; data: VersionRetentionUpdate; context: string }) =>
      documentsService.updateVersionRetention(request.documentId, request.version, request.data),
    onSuccess: (_, request) => {
      client.invalidateQueries({ queryKey: ["document-versions", request.documentId] });
      client.invalidateQueries({ queryKey: ["document", request.documentId] });
      if (context.current !== request.context) return;
      setError("");
      setSelectedDate("");
      toast.success("Retención de la versión actualizada");
    },
    onError: (failure: unknown, request) => {
      if (context.current !== request.context) return;
      const message = (failure as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al actualizar la retención de la versión";
      setError(message);
      toast.error(message);
    },
    onSettled: () => { pending.current = false; },
  });

  function save(data: VersionRetentionUpdate) {
    if (pending.current || mutation.isPending || version.canManageRetention !== true) return;
    pending.current = true;
    setError("");
    mutation.mutate({ documentId, version: version.version, data, context: context.current });
  }

  function saveDate() {
    if (pending.current || mutation.isPending) return;
    const preserveUntil = retentionDateToISO(selectedDate);
    if (!preserveUntil) {
      setError("Selecciona una fecha válida futura");
      return;
    }
    save({ mode: "until", preserveUntil });
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      {isCurrent && <p>Versión actual: no caduca automáticamente.</p>}
      {version.preservePermanently && <p>Conservación permanente.</p>}
      {version.isRetentionProtected && <p>Protegida por flujo o aprobación: no caduca automáticamente.</p>}
      {version.preserveUntil && <p>Conservación solicitada hasta: {displayDate(version.preserveUntil)}</p>}
      {version.expiresAt ? <p>Vencimiento efectivo: {displayDate(version.expiresAt)}</p> :
        <p>{version.expiresAt === null ? "Sin vencimiento automático." : "Vencimiento no disponible."}</p>}
      {version.supersededAt && <p>Reemplazada el: {displayDate(version.supersededAt)}</p>}
      {version.retentionGraceUntil && <p>Período de gracia hasta: {displayDate(version.retentionGraceUntil)}</p>}
      {version.canManageRetention === true && (
        <div className="space-y-2" role="group" aria-label={`Retención de versión ${version.version}`}>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => save({ mode: "normal" })}>Retención normal</Button>
            <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => save({ mode: "permanent" })}>Conservar permanentemente</Button>
          </div>
          <Label htmlFor={id}>Conservar hasta</Label>
          <div className="flex flex-wrap gap-2">
            <Input id={id} type="date" value={selectedDate} disabled={mutation.isPending} aria-describedby={`${id}-help`} onChange={(event) => { setSelectedDate(event.target.value); setError(""); }} className="max-w-xs" />
            <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={saveDate}>Aplicar fecha</Button>
          </div>
          <p id={`${id}-help`} className="text-muted-foreground">Se conserva hasta el final del día seleccionado en tu zona horaria local. Una fecha anterior al plazo normal no lo acorta; el vencimiento efectivo puede ser posterior a la fecha solicitada.</p>
          {mutation.isPending && <p role="status">Actualizando retención…</p>}
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
