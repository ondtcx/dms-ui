"use client";

import { useEffect, useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentMetadataForm } from "./DocumentMetadataForm";
import { documentsService } from "@/lib/services/documents.service";
import { useDirectorySubmission } from "@/hooks/use-directory-submission";
import {
  EMPTY_UPLOAD_METADATA,
  findDefaultDocumentType,
  type AcademicYear,
  type Document,
  type DocumentType,
  type UploadMetadata,
} from "@/lib/types";
import { validOriginDate } from "@/lib/upload-date";
import { formatFileSize } from "@/lib/utils";

interface QueueItem {
  id: number;
  file: File;
  metadata: UploadMetadata;
}
interface UploadDocumentsDialogProps {
  open: boolean;
  multiple: boolean;
  directoryId: number | null;
  uploadDocumentTypes?: Pick<DocumentType, "id" | "name" | "isDefault">[];
  academicYears?: AcademicYear[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * Contexto capturado por operación: reclamación propia, generación de diálogo
 * (sesión/actor/carpeta), actor, carpeta y las entradas encoladas. Un
 * asentamiento solo puede pintar progreso/éxito/error si sigue siendo la
 * operación vigente, para no contaminar otra carpeta ni llamar `onSuccess` sobre
 * el destino equivocado.
 */
interface UploadOperation {
  claim: number;
  generation: number;
  actorId: string | null;
  directoryId: number | null;
  queueIds: number[];
}

export function UploadDocumentsDialog({
  open,
  multiple,
  directoryId,
  uploadDocumentTypes,
  academicYears,
  onOpenChange,
  onSuccess,
}: UploadDocumentsDialogProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const nextId = useRef(0);
  const busy = useRef(false);
  const inputId = useId();

  // Autoridad de envío derivada del backend para el actor y la carpeta actuales.
  const submission = useDirectorySubmission(directoryId, open);
  const uploadBlocked = !submission.canSubmit;
  const singleQuota = submission.isReception && submission.singleQuota;

  const reset = () => {
    setQueue([]);
    setError(undefined);
    setProgress(0);
  };

  const initialMetadata = (): UploadMetadata => ({
    ...EMPTY_UPLOAD_METADATA,
    // Los nuevos archivos parten con `Documento general` preseleccionado.
    documentTypeId: findDefaultDocumentType(uploadDocumentTypes)?.id,
  });

  // Generación de diálogo: cambia al abrir/cerrar y al cambiar de actor o
  // carpeta, de modo que una operación antigua nunca pueda asentarse en la nueva
  // sesión (incluida una reapertura con el mismo actor y carpeta).
  const contextKey = `${submission.actorId ?? "-"}|${directoryId ?? "-"}`;
  const generationRef = useRef(0);
  const lastOpenRef = useRef(open);
  const lastContextRef = useRef<string | null>(null);
  if (lastOpenRef.current !== open) {
    lastOpenRef.current = open;
    generationRef.current += 1;
  }
  if (lastContextRef.current !== contextKey) {
    lastContextRef.current = contextKey;
    generationRef.current += 1;
  }
  const generation = generationRef.current;

  // Al cambiar de generación se limpia el borrador visible (incluso con una
  // petición antigua pendiente), sin liberar la reclamación pendiente antigua.
  useEffect(() => {
    reset();
  }, [generation]);

  // Cuando la lista activa termina de cargar, completa el tipo predeterminado
  // en los archivos ya encolados que aún no tienen un tipo asignado.
  const defaultTypeId = findDefaultDocumentType(uploadDocumentTypes)?.id;
  useEffect(() => {
    if (defaultTypeId === undefined) return;
    setQueue((current) =>
      current.some((item) => item.metadata.documentTypeId === undefined)
        ? current.map((item) =>
            item.metadata.documentTypeId === undefined
              ? {
                  ...item,
                  metadata: { ...item.metadata, documentTypeId: defaultTypeId },
                }
              : item,
          )
        : current,
    );
  }, [defaultTypeId]);

  const liveContextRef = useRef<{ actorId: string | null; directoryId: number | null }>({
    actorId: submission.actorId,
    directoryId,
  });
  liveContextRef.current = { actorId: submission.actorId, directoryId };
  const liveGenerationRef = useRef(generation);
  liveGenerationRef.current = generation;
  const operationRef = useRef<UploadOperation | null>(null);
  const claimRef = useRef(0);
  const claimSeq = useRef(0);

  const isCurrentOperation = () => {
    const operation = operationRef.current;
    const live = liveContextRef.current;
    return (
      operation !== null &&
      operation.claim === claimRef.current &&
      operation.generation === liveGenerationRef.current &&
      operation.actorId === live.actorId &&
      operation.directoryId === live.directoryId
    );
  };

  const close = () => {
    if (busy.current) return;
    reset();
    onOpenChange(false);
  };

  const addFiles = (files: File[]) => {
    if (
      !open ||
      busy.current ||
      submission.actorId === null ||
      uploadBlocked ||
      !files.length
    )
      return;
    if (singleQuota) {
      if (queue.length >= 1) {
        setError(
          "Esta carpeta permite un solo documento por persona; la cuota se conserva de por vida aunque muevas el documento.",
        );
        return;
      }
      const [first] = files;
      setQueue([
        { id: nextId.current++, file: first, metadata: initialMetadata() },
      ]);
      setError(
        "Esta carpeta permite un solo documento por persona; la cuota se conserva de por vida aunque muevas el documento.",
      );
      return;
    }
    if (
      (!multiple && files.length !== 1) ||
      (multiple && queue.length + files.length > 10)
    ) {
      setError(
        multiple
          ? "Puedes cargar hasta 10 archivos por lote."
          : "Selecciona un solo archivo.",
      );
      return;
    }
    const entries = files.map((file) => ({
      id: nextId.current++,
      file,
      metadata: initialMetadata(),
    }));
    setQueue((current) => (multiple ? [...current, ...entries] : entries));
    setError(undefined);
  };

  const submit = async () => {
    if (!open || busy.current || !queue.length) return;
    // Revalida la autoridad vigente justo antes de despachar; nunca confía en una
    // decisión de render anterior ni en el estado del destinatario.
    if (submission.actorId === null || uploadBlocked || !submission.canSubmit)
      return;
    if (singleQuota && queue.length !== 1) {
      setError(
        "Esta carpeta permite un solo documento por persona; selecciona un único archivo.",
      );
      return;
    }
    if (
      queue.some(
        ({ metadata }) =>
          metadata.documentTypeId === undefined ||
          (metadata.documentTypeId !== null &&
            (!Number.isInteger(metadata.documentTypeId) ||
              metadata.documentTypeId < 1)) ||
          (metadata.originDate !== undefined &&
            !validOriginDate(metadata.originDate)),
      )
    ) {
      setError(
        "Selecciona el tipo de documento de cada archivo y verifica las fechas de origen.",
      );
      return;
    }
    const claim = ++claimSeq.current;
    claimRef.current = claim;
    busy.current = true;
    operationRef.current = {
      claim,
      generation: liveGenerationRef.current,
      actorId: submission.actorId,
      directoryId,
      queueIds: queue.map((item) => item.id),
    };
    setSubmitting(true);
    setError(undefined);
    setProgress(0);
    try {
      const reportProgress = (value: number) => {
        if (!isCurrentOperation()) return;
        setProgress((current) => Math.max(current, value));
      };
      let documents: Document[];
      if (multiple && !singleQuota) {
        documents = await documentsService.uploadMultiple(
          queue.map((item) => item.file),
          queue.map((item) => item.metadata),
          directoryId,
          reportProgress,
        );
      } else {
        documents = [
          await documentsService.upload(
            queue[0].file,
            { ...queue[0].metadata, directoryId },
            reportProgress,
          ),
        ];
      }
      if (isCurrentOperation()) {
        toast.success(
          multiple && !singleQuota && queue.length > 1
            ? `${queue.length} archivo(s) subido(s) exitosamente`
            : "Archivo subido exitosamente",
        );
        documents.forEach((document, index) =>
          document.warnings?.forEach((warning) =>
            toast(`${queue[index]?.file.name}: ${warning}`, {
              duration: 10000,
            }),
          ),
        );
        reset();
        onSuccess();
        onOpenChange(false);
      }
    } catch (caught) {
      if (isCurrentOperation()) {
        const message = (
          caught as { response?: { data?: { message?: string | string[] } } }
        ).response?.data?.message;
        setError(
          Array.isArray(message)
            ? message.join("; ")
            : message || "Error al subir archivos. Puedes volver a intentarlo.",
        );
      }
    } finally {
      // Libera únicamente la reclamación propia: nunca limpia una reclamación
      // más nueva ni deja el diálogo bloqueado tras un cambio de contexto.
      const operation = operationRef.current;
      if (operation?.claim === claim) operationRef.current = null;
      if (claimRef.current === claim) {
        claimRef.current = 0;
        busy.current = false;
        setSubmitting(false);
      }
    }
  };

  const notice = (() => {
    if (!uploadBlocked) return null;
    if (submission.busy)
      return (
        <p role="status" className="text-sm text-muted-foreground">
          Verificando los permisos de la carpeta...
        </p>
      );
    if (submission.isReception)
      return (
        <p role="alert" className="text-destructive">
          No tienes autorización para subir documentos a esta carpeta de
          recepción.
        </p>
      );
    return (
      <p role="alert" className="text-destructive">
        {submission.error ?? "No se pudo verificar la carpeta de destino."}
      </p>
    );
  })();

  const inputDisabled =
    submitting || uploadBlocked || (singleQuota && queue.length >= 1);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        showCloseButton={!submitting}
        className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (busy.current) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy.current) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {multiple ? "Subir Múltiples Documentos" : "Subir Documento"}
          </DialogTitle>
          <DialogDescription>
            Agrega archivos y completa los metadatos de cada documento. El
            servidor determina el año lectivo.
          </DialogDescription>
        </DialogHeader>
        {notice}
        <div
          data-testid="upload-drop-zone"
          className="border-2 border-dashed rounded-md p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <label htmlFor={inputId}>
            {multiple ? "Archivos *" : "Archivo *"}
          </label>
          <Input
            id={inputId}
            type="file"
            multiple={multiple && !singleQuota}
            disabled={inputDisabled}
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <p className="text-sm text-muted-foreground">
            {singleQuota
              ? "Arrastra y suelta un único archivo aquí."
              : `Arrastra y suelta ${
                  multiple ? "hasta 10 archivos" : "un archivo"
                } aquí.`}
          </p>
        </div>
        {queue.map((item) => (
          <section
            key={item.id}
            role="group"
            aria-label={item.file.name}
            className="space-y-2 border rounded-md p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span>
                {item.file.name} ({formatFileSize(item.file.size)})
              </span>
              <Button
                variant="outline"
                disabled={submitting}
                aria-label={`Quitar ${item.file.name}`}
                onClick={() =>
                  setQueue((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  )
                }
              >
                Quitar
              </Button>
            </div>
            <DocumentMetadataForm
              value={item.metadata}
              uploadDocumentTypes={uploadDocumentTypes}
              academicYears={academicYears}
              disabled={submitting}
              onChange={(metadata) => {
                if (!busy.current)
                  setQueue((current) =>
                    current.map((entry) =>
                      entry.id === item.id ? { ...entry, metadata } : entry,
                    ),
                  );
              }}
            />
          </section>
        ))}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {submitting && (
          <div role="status" aria-live="polite">
            <progress
              aria-label="Progreso de carga"
              value={progress}
              max={100}
            />
            <p>
              {progress}% —{" "}
              {progress === 100
                ? "Procesando documentos..."
                : "Subiendo archivos..."}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={close}>
            Cancelar
          </Button>
          <Button
            disabled={submitting || uploadBlocked || !queue.length}
            onClick={submit}
          >
            {submitting
              ? "Procesando..."
              : multiple && !singleQuota
                ? `Subir ${queue.length} archivo(s)`
                : "Subir Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
