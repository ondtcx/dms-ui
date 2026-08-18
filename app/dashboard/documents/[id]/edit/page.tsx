"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import OnlyOfficeEditor from "@/components/documents/OnlyOfficeEditor";
import { DocumentEditor } from "@/components/document-editor";
import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";
import { onlyofficeService } from "@/lib/services/onlyoffice.service";
import { Document } from "@/lib/types";
import { isTextEditable } from "@/lib/utils";

type EditorMode = "checking" | "onlyoffice" | "basic" | "unavailable";

export default function EditDocumentPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editorMode, setEditorMode] = useState<EditorMode>("checking");
  const [doc, setDoc] = useState<Document | null>(null);
  const [config, setConfig] = useState<unknown>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEditor = async () => {
      try {
        const [document, onlyofficeAvailable] = await Promise.all([
          documentsService.getOne(id),
          onlyofficeService.checkHealth(),
        ]);
        if (cancelled) return;
        setDoc(document);

        const mode = new URLSearchParams(window.location.search).get("mode");
        const mimetype = document.versions?.[0]?.mimetype ?? "";

        if (mode === "basic" && isTextEditable(mimetype)) {
          const blob = await documentsService.view(id);
          if (!cancelled) {
            setContent(await blob.text());
            setEditorMode("basic");
          }
          return;
        }

        if (onlyofficeAvailable) {
          const response = await api.get(`/onlyoffice/config/${id}`);
          if (!cancelled) {
            setConfig(response.data);
            setEditorMode("onlyoffice");
          }
          return;
        }

        if (!isTextEditable(mimetype)) {
          setEditorMode("unavailable");
          return;
        }

        const blob = await documentsService.view(id);
        if (!cancelled) {
          setContent(await blob.text());
          setEditorMode("basic");
        }
      } catch {
        if (!cancelled) setEditorMode("unavailable");
      }
    };

    void loadEditor();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveContent = async () => {
    setIsSaving(true);
    try {
      await documentsService.saveContent(id, content);
      await queryClient.invalidateQueries({ queryKey: ["document", id] });
      toast.success("Documento guardado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const downloadDocument = async () => {
    try {
      const blob = await documentsService.download(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc?.versions?.[0]?.filename ?? "documento";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar el documento");
    }
  };

  if (editorMode === "checking") {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Cargando editor...</span>
      </div>
    );
  }

  if (editorMode === "onlyoffice") {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <OnlyOfficeEditor config={config} />
      </div>
    );
  }

  if (editorMode === "basic") {
    return (
      <div className="flex h-screen flex-col gap-4 p-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
          OnlyOffice no está disponible. Estás usando el editor básico.
        </div>
        <div className="min-h-0 flex-1">
          <DocumentEditor
            title={doc?.versions?.[0]?.filename ?? "Documento"}
            content={content}
            onContentChange={setContent}
            isSaving={isSaving}
            onSave={saveContent}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">El editor OnlyOffice no está disponible</h1>
      <p className="max-w-md text-muted-foreground">
        Este tipo de archivo no puede editarse con el editor básico. Descargalo para editarlo
        localmente y luego volvé a subirlo usando «Reemplazar archivo».
      </p>
      <div className="flex gap-3">
        <button type="button" className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={downloadDocument}>
          Descargar
        </button>
        <button type="button" className="rounded-md border px-4 py-2" onClick={() => router.back()}>
          Volver
        </button>
      </div>
    </div>
  );
}
