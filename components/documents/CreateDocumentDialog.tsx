"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FilePlus2,
  FileText,
  FolderInput,
  LayoutTemplate,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authoringService } from "@/lib/services/authoring.service";
import { DocumentMetadataForm } from "./DocumentMetadataForm";
import {
  EMPTY_UPLOAD_METADATA,
  findDefaultDocumentType,
  type AcademicYear,
  type DocumentType,
  type UploadMetadata,
} from "@/lib/types";
import type { AuthoringTemplate } from "@/lib/types/authoring";

type CreationMode = "editor" | "template" | "upload";

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadDocumentTypes?: Pick<DocumentType, "id" | "name" | "isDefault">[];
  academicYears?: AcademicYear[];
  uploadDisabled?: boolean;
  onUploadSingle: () => void;
  onUploadMultiple: () => void;
}

function initialMetadata(
  uploadDocumentTypes?: Pick<DocumentType, "id" | "name" | "isDefault">[],
): UploadMetadata {
  return {
    ...EMPTY_UPLOAD_METADATA,
    documentTypeId: findDefaultDocumentType(uploadDocumentTypes)?.id,
  };
}

function publishedVersion(template: AuthoringTemplate | undefined) {
  return template?.versions.find((version) => version.status === "PUBLISHED");
}

export function CreateDocumentDialog({
  open,
  onOpenChange,
  uploadDocumentTypes,
  academicYears,
  uploadDisabled = false,
  onUploadSingle,
  onUploadMultiple,
}: CreateDocumentDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CreationMode>("editor");
  const [institutionalFrame, setInstitutionalFrame] = useState(false);
  const [metadata, setMetadata] = useState<UploadMetadata>(() =>
    initialMetadata(uploadDocumentTypes),
  );
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["authoring-templates", "published"],
    queryFn: () => authoringService.listTemplates(),
    enabled: open,
    staleTime: 60_000,
  });

  const templates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (template) => !template.isBlank && publishedVersion(template),
      ),
    [templatesQuery.data],
  );

  const filteredTemplates = useMemo(() => {
    const needle = templateSearch.trim().toLocaleLowerCase("es");
    if (!needle) return templates;
    return templates.filter((template) =>
      `${template.name} ${template.description ?? ""}`
        .toLocaleLowerCase("es")
        .includes(needle),
    );
  }, [templates, templateSearch]);

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );
  const selectedVersion = publishedVersion(selectedTemplate);

  useEffect(() => {
    if (!open) return;
    setMode("editor");
    setInstitutionalFrame(false);
    setMetadata(initialMetadata(uploadDocumentTypes));
    setTemplateSearch("");
    setSelectedTemplateId(null);
    setError(null);
    setBusy(false);
  }, [open, uploadDocumentTypes]);

  const selectTemplate = (template: AuthoringTemplate) => {
    setSelectedTemplateId(template.id);
    setError(null);
    setMetadata((current) => ({
      ...current,
      documentTypeId: template.documentTypeId ?? current.documentTypeId,
    }));
  };

  const create = async () => {
    if (mode === "editor" && !metadata.name?.trim()) {
      setError("Escribe un nombre para el documento.");
      return;
    }
    if (mode === "template" && !selectedVersion) {
      setError("Selecciona una plantilla publicada.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await authoringService.createDocument({
        blank: mode === "editor",
        institutionalFrame:
          mode === "editor" ? institutionalFrame : undefined,
        templateVersionId:
          mode === "template" ? selectedVersion?.id : undefined,
        name: metadata.name?.trim() || undefined,
        description: metadata.description?.trim() || undefined,
        documentTypeId: metadata.documentTypeId ?? undefined,
        originDate: metadata.originDate || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["authoring-documents"] }),
        queryClient.invalidateQueries({
          queryKey: ["document-review-pending"],
        }),
      ]);
      toast.success(
        mode === "editor"
          ? "Documento creado en el editor"
          : "Documento creado desde la plantilla",
      );
      onOpenChange(false);
      router.push(`/dashboard/elaboracion/${created.id}/editar`);
    } catch (cause) {
      const message = (
        cause as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join("; ")
          : message || "No se pudo crear el documento.",
      );
    } finally {
      setBusy(false);
    }
  };

  const primaryLabel =
    mode === "editor" ? "Crear en editor" : "Crear desde plantilla";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear documento</DialogTitle>
          <DialogDescription>
            Elige cómo quieres crearlo. El editor es la opción predeterminada;
            también puedes partir de una plantilla o subir archivos.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as CreationMode);
            setError(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Editor
            </TabsTrigger>
            <TabsTrigger value="template">
              <LayoutTemplate className="mr-1.5 h-4 w-4" /> Plantilla
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-1.5 h-4 w-4" /> Subir
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Se creará una hoja institucional en blanco y se abrirá el editor
              para que escribas el contenido.
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <Checkbox
                checked={institutionalFrame}
                onCheckedChange={(checked) => setInstitutionalFrame(checked === true)}
                disabled={busy}
                aria-label="Usar formato institucional del Acta de entrega-recepción"
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium">
                  Usar formato institucional (Acta de entrega-recepción)
                </span>
                <span className="block text-xs text-muted-foreground">
                  Incluye encabezado, logo, pie y marco institucional. El título
                  y subtítulo se pueden editar.
                </span>
              </span>
            </label>
            <DocumentMetadataForm
              value={metadata}
              onChange={setMetadata}
              uploadDocumentTypes={uploadDocumentTypes}
              academicYears={academicYears}
              showNumber={false}
              nameHelp="Nombre visible en la bandeja de documentos."
              disabled={busy}
            />
          </TabsContent>

          <TabsContent value="template" className="space-y-3 pt-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Buscar plantilla por nombre o descripción"
                className="pl-9"
                aria-label="Buscar plantilla"
              />
            </div>

            {templatesQuery.isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando
                plantillas…
              </div>
            ) : filteredTemplates.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No hay plantillas publicadas que coincidan con la búsqueda.
              </p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {filteredTemplates.map((template) => {
                  const active = template.id === selectedTemplateId;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => selectTemplate(template)}
                      aria-pressed={active}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {template.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {template.description || "Plantilla institucional"}
                        </span>
                        {template.documentType ? (
                          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {template.documentType.name}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTemplate ? (
              <DocumentMetadataForm
                value={metadata}
                onChange={setMetadata}
                uploadDocumentTypes={uploadDocumentTypes}
                academicYears={academicYears}
                showNumber={false}
                nameHelp="Opcional. Si lo dejas vacío, se usará el nombre de la plantilla."
                disabled={busy}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              La carga conserva su flujo actual: eliges los archivos y completas
              los metadatos en el diálogo de subida.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={uploadDisabled}
                onClick={() => {
                  onOpenChange(false);
                  onUploadSingle();
                }}
              >
                <Upload className="mr-2 h-4 w-4" /> Subir un archivo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                disabled={uploadDisabled}
                onClick={() => {
                  onOpenChange(false);
                  onUploadMultiple();
                }}
              >
                <FolderInput className="mr-2 h-4 w-4" /> Subir varios archivos
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          {mode !== "upload" ? (
            <Button
              type="button"
              onClick={create}
              disabled={
                busy ||
                (mode === "template" && !selectedVersion) ||
                (mode === "editor" && !metadata.name?.trim())
              }
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : mode === "editor" ? (
                <FilePlus2 className="mr-2 h-4 w-4" />
              ) : (
                <LayoutTemplate className="mr-2 h-4 w-4" />
              )}
              {primaryLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
