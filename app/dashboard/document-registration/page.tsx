"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FolderInput, RefreshCw, Upload } from "lucide-react";

import { DocumentMetadataForm } from "@/components/documents/DocumentMetadataForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUploadMetadata } from "@/hooks/use-upload-metadata";
import { useAuth } from "@/lib/contexts/AuthContext";
import { documentsService } from "@/lib/services/documents.service";
import { EMPTY_UPLOAD_METADATA, UploadMetadata } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";

type RegistrationMode = "single" | "multiple";

export default function DocumentRegistrationPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<RegistrationMode>("single");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState<UploadMetadata>(EMPTY_UPLOAD_METADATA);

  const {
    categories,
    loadingCategories,
    academicYears,
    uploadDocumentTypes,
    allCourses,
    loadingCourses,
    courseSubjects,
    loadingSubjects,
    selectedCategory,
    showCourseFields,
  } = useUploadMetadata({
    categoryId: uploadData.categoryId,
    courseId: uploadData.courseId,
  });

  const isSingleMode = mode === "single";
  const pageDescription = useMemo(() => {
    return isSingleMode
      ? "Registra un documento físico o digital con sus metadatos y ubicación física."
      : "Carga varios archivos en un solo flujo, reutilizando la misma metadata institucional.";
  }, [isSingleMode]);

  const resetState = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setUploadData(EMPTY_UPLOAD_METADATA);
  };

  const handleSingleUpload = async () => {
    setUploading(true);
    try {
      await documentsService.upload(selectedFile, uploadData);
      toast.success(selectedFile ? "Documento registrado exitosamente" : "Documento físico registrado exitosamente");
      resetState();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Error al registrar documento";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleMultipleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecciona al menos un archivo");
      return;
    }

    setUploading(true);
    try {
      await documentsService.uploadMultiple(selectedFiles, uploadData);
      toast.success(`${selectedFiles.length} archivo(s) subido(s) exitosamente`);
      resetState();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Error al subir archivos";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-2 md:p-4">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registro documental</h1>
            <p className="text-sm text-muted-foreground mt-1">{pageDescription}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/documents">Ir a archivo y consulta</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Modo de registro</CardTitle>
          <CardDescription>
            Selecciona si deseas registrar un documento individual o una carga múltiple.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isSingleMode ? "default" : "outline"}
              onClick={() => {
                setMode("single");
                setSelectedFiles([]);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Registro individual
            </Button>
            <Button
              type="button"
              variant={!isSingleMode ? "default" : "outline"}
              onClick={() => {
                setMode("multiple");
                setSelectedFile(null);
              }}
            >
              <FolderInput className="mr-2 h-4 w-4" />
              Carga múltiple
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isSingleMode ? "Nuevo documento" : "Carga múltiple de documentos"}</CardTitle>
          <CardDescription>
            {isSingleMode
              ? "Completa los datos del documento y adjunta un archivo solo si existe versión digital."
              : "Usa este modo para subir varios archivos con la misma clasificación y metadata base."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSingleMode ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Archivo digital</label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
              {selectedFile ? (
                <p className="text-sm text-muted-foreground">
                  Archivo seleccionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Déjalo vacío si deseas registrar un documento exclusivamente físico.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Archivos</label>
              <Input
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                className="cursor-pointer"
              />
              {selectedFiles.length > 0 ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedFiles.length} archivo(s) seleccionado(s)</p>
                  {selectedFiles.map((file, index) => (
                    <p key={`${file.name}-${index}`}>• {file.name} ({formatFileSize(file.size)})</p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Selecciona varios archivos para registrarlos con la misma metadata base.
                </p>
              )}
            </div>
          )}

          <DocumentMetadataForm
            value={uploadData}
            onChange={setUploadData}
            categories={categories}
            loadingCategories={loadingCategories}
            selectedCategory={selectedCategory}
            showCourseFields={showCourseFields}
            academicYears={academicYears}
            showAcademicYear={true}
            uploadDocumentTypes={uploadDocumentTypes}
            showDocumentType={true}
            allCourses={allCourses}
            loadingCourses={loadingCourses}
            courseSubjects={courseSubjects}
            loadingSubjects={loadingSubjects}
            userRole={user?.role}
            descriptionLabel={isSingleMode ? "Descripción" : "Descripción base (opcional)"}
            visibilityLabel={isSingleMode ? "Hacer público (visible para todos los usuarios)" : "Hacer públicos (visible para todos los usuarios)"}
            isPublicCheckboxId={isSingleMode ? "registration-is-public" : "registration-multiple-is-public"}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetState} disabled={uploading}>
              Limpiar formulario
            </Button>
            <Button
              type="button"
              onClick={isSingleMode ? handleSingleUpload : handleMultipleUpload}
              disabled={uploading || (!isSingleMode && selectedFiles.length === 0)}
            >
              {uploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isSingleMode ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFile ? "Registrar documento" : "Registrar documento físico"}
                </>
              ) : (
                <>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Registrar {selectedFiles.length || "varios"} documento(s)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
