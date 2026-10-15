"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

export const isOfficePreviewType = (mime: string) =>
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-excel",
  ].includes(mime);

interface Props {
  documentId: number;
  versionKey: string;
  mimetype: string;
  onDownload: () => void;
}

export default function OfficeDocumentPreview({
  documentId,
  versionKey,
  mimetype,
  onDownload,
}: Props) {
  const [state, setState] = useState<{
    key: string;
    url?: string;
    error?: string;
  }>({ key: "" });
  const key = `${documentId}:${versionKey}:${mimetype}`;
  const legacy =
    mimetype === "application/msword" ||
    mimetype === "application/vnd.ms-excel";
  useEffect(() => {
    if (legacy) return;
    let active = true;
    let url: string | undefined;
    setState({ key });
    void api
      .get<Blob>(`/documents/${documentId}/preview`, {
        responseType: "blob",
        timeout: 75000,
        silentErrors: [400, 403, 404, 503],
      })
      .then((response) => {
        if (!active) return;
        if (response.data.type !== "application/pdf")
          throw new Error("Respuesta no válida");
        url = URL.createObjectURL(response.data);
        setState({ key, url });
      })
      .catch(async (error) => {
        let message =
          "No se pudo cargar la vista previa básica. Puedes descargar el original.";
        if (error.response?.data instanceof Blob) {
          try {
            const data = JSON.parse(await error.response.data.text());
            if (typeof data.message === "string") message = data.message;
          } catch {
            /* Se conserva el mensaje seguro de respaldo. */
          }
        }
        if (active) setState({ key, error: message });
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId, key, legacy]);

  return (
    <section aria-label="Vista previa básica de Office">
      <p className="text-sm text-muted-foreground mb-3">
        Vista básica de solo lectura en PDF. El diseño puede diferir del
        original; las hojas no son interactivas y las fórmulas no se recalculan.
      </p>
      {legacy ? (
        <p role="status">
          Los formatos DOC y XLS no son compatibles. Descarga el original para
          visualizarlo.
        </p>
      ) : state.key !== key || (!state.url && !state.error) ? (
        <p role="status">Cargando vista previa básica...</p>
      ) : state.error ? (
        <p role="alert">{state.error}</p>
      ) : (
        <iframe
          src={state.url}
          title="Vista previa básica del documento"
          className="w-full h-[600px] border rounded-md"
        />
      )}
      <button type="button" className="mt-3 underline" onClick={onDownload}>
        Descargar original
      </button>
    </section>
  );
}
