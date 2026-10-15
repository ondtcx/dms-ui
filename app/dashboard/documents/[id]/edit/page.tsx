"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import OnlyOfficeEditor from "@/components/documents/OnlyOfficeEditor";
import { DocumentEditor } from "@/components/document-editor";
import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";
import { onlyofficeService } from "@/lib/services/onlyoffice.service";
import { Document } from "@/lib/types";
import { isTextEditable } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import { readDocumentActionCapabilities } from "@/lib/document-action-capabilities";

type EditorMode = "checking" | "onlyoffice" | "basic" | "unavailable";

export default function EditDocumentPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const identity = `${user?.id ?? ""}:${id}`;
  const current = useRef({ identity, epoch: {}, alive: true });
  if (current.current.identity !== identity) current.current = { identity, epoch: {}, alive: true };
  const epoch = current.current.epoch;
  useEffect(() => {
    current.current.alive = true;
    return () => { current.current.alive = false; };
  }, []);
  const queryKey = ["document", id, user?.id];
  const query = useQuery({
    queryKey,
    queryFn: () => documentsService.getOne(id),
    enabled: !!user?.id && Number.isSafeInteger(id) && id > 0,
    placeholderData: () => undefined,
    retry: false,
  });
  const doc = query.isSuccess && query.data?.id === id ? query.data : null;
  const canEdit = () => {
    const snapshot = queryClient.getQueryData<Document>(queryKey);
    const state = queryClient.getQueryState(queryKey);
    return !!user?.id && current.current.alive && current.current.epoch === epoch &&
      state?.status === "success" && state.fetchStatus === "idle" && !state.isInvalidated &&
      snapshot?.id === id && readDocumentActionCapabilities(snapshot)?.editContent === true;
  };
  const [editorMode, setEditorMode] = useState<EditorMode>("checking");
  const [loadedEpoch, setLoadedEpoch] = useState<object | null>(null);
  const [config, setConfig] = useState<unknown>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const savingEpoch = useRef<object | null>(null);
  const initialized = useRef<{ epoch: object; version: string } | null>(null);

  useEffect(() => {
    if (query.isFetching) return;
    const version = `${doc?.currentVersion}:${doc?.versions?.[0]?.id}`;
    if (initialized.current?.epoch === epoch && initialized.current.version === version &&
      doc && readDocumentActionCapabilities(doc)?.editContent === true) return;
    let cancelled = false;
    setEditorMode("checking");
    setConfig(null);
    setContent("");
    setIsSaving(false);
    setLoadedEpoch(epoch);
    initialized.current = null;
    if (!doc || readDocumentActionCapabilities(doc)?.editContent !== true) return;
    const active = () => !cancelled && current.current.alive && current.current.epoch === epoch && canEdit();

    const loadEditor = async () => {
      try {
        const document = doc;
        const onlyofficeAvailable = await onlyofficeService.checkHealth();
        if (!active()) return;

        const mode = new URLSearchParams(window.location.search).get("mode");
        const mimetype = document.versions?.[0]?.mimetype ?? "";

        if (mode === "basic" && isTextEditable(mimetype)) {
          const blob = await documentsService.view(id);
          const text = await blob.text();
          if (active()) {
            setContent(text);
            setEditorMode("basic");
            initialized.current = { epoch, version };
          }
          return;
        }

        if (onlyofficeAvailable) {
          const response = await api.get(`/onlyoffice/config/${id}`);
          if (active()) {
            setConfig(response.data);
            setEditorMode("onlyoffice");
            initialized.current = { epoch, version };
          }
          return;
        }

        if (!isTextEditable(mimetype)) {
          setEditorMode("unavailable");
          initialized.current = { epoch, version };
          return;
        }

        const blob = await documentsService.view(id);
        const text = await blob.text();
        if (active()) {
          setContent(text);
          setEditorMode("basic");
          initialized.current = { epoch, version };
        }
      } catch {
        if (!cancelled && current.current.epoch === epoch) setEditorMode("unavailable");
      }
    };

    void loadEditor();
    return () => {
      cancelled = true;
    };
  }, [id, doc, epoch, query.isFetching]);

  const saveContent = async () => {
    if (!canEdit() || savingEpoch.current === epoch) return;
    savingEpoch.current = epoch;
    setIsSaving(true);
    try {
      await documentsService.saveContent(id, content);
      if (!canEdit()) return;
      await queryClient.invalidateQueries({ queryKey: ["document", id] });
      if (!canEdit()) return;
      toast.success("Documento guardado");
    } catch {
      if (current.current.alive && current.current.epoch === epoch) toast.error("Error al guardar");
    } finally {
      if (current.current.alive && current.current.epoch === epoch) {
        savingEpoch.current = null;
        setIsSaving(false);
      }
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

  if (doc && !query.isFetching && readDocumentActionCapabilities(doc)?.editContent !== true) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1>No tienes permiso para editar este documento</h1>
      <button type="button" onClick={() => router.back()}>Volver</button>
    </div>;
  }

  if (query.isError || (!query.isPending && !doc)) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1>No se pudo comprobar el permiso de edición</h1>
      <button type="button" onClick={() => router.back()}>Volver</button>
    </div>;
  }

  if (query.isPending || loadedEpoch !== epoch || editorMode === "checking" || (editorMode === "onlyoffice" && !canEdit())) {
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
        <fieldset disabled={!canEdit() || isSaving} className="min-h-0 flex-1">
          <DocumentEditor
            title={doc?.versions?.[0]?.filename ?? "Documento"}
            content={content}
            onContentChange={setContent}
            isSaving={isSaving}
            onSave={saveContent}
          />
        </fieldset>
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
