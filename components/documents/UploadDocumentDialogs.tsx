"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Upload } from "lucide-react";

import { DocumentMetadataForm } from "@/components/documents/DocumentMetadataForm";
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
import { useUploadMetadata } from "@/hooks/use-upload-metadata";
import { documentsService } from "@/lib/services/documents.service";
import {
  EMPTY_UPLOAD_METADATA,
  type Document,
  type UploadMetadata,
} from "@/lib/types";
import { formatFileSize } from "@/lib/utils";

interface BaseUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
  onSuccess?: (documents: Document[]) => void;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  userRole,
  onSuccess,
}: BaseUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const resetState = () => {
    setSelectedFile(null);
    setUploadData(EMPTY_UPLOAD_METADATA);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen && !uploading) {
      resetState();
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const uploaded = await documentsService.upload(selectedFile, uploadData);
      toast.success(
        selectedFile
          ? "Documento registrado exitosamente"
          : "Documento físico registrado exitosamente",
      );
      resetState();
      onOpenChange(false);
      onSuccess?.([uploaded]);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Error al subir archivo";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>
            Completa la información del documento que deseas subir
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4 pr-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Archivo digital</label>
            <Input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
            {!selectedFile && (
              <p className="text-xs text-muted-foreground">
                Déjalo vacío si deseas registrar un documento exclusivamente físico.
              </p>
            )}
          </div>

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
            userRole={userRole}
            descriptionLabel="Descripción"
            visibilityLabel="Hacer público (visible para todos los usuarios)"
            isPublicCheckboxId="isPublic"
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading
              ? "Guardando..."
              : selectedFile
                ? "Subir Documento"
                : "Registrar Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UploadMultipleDocumentsDialog({
  open,
  onOpenChange,
  userRole,
  onSuccess,
}: BaseUploadDialogProps) {
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

  const resetState = () => {
    setSelectedFiles([]);
    setUploadData(EMPTY_UPLOAD_METADATA);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen && !uploading) {
      resetState();
    }
  };

  const handleUploadMultiple = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecciona al menos un archivo");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await documentsService.uploadMultiple(selectedFiles, uploadData);
      toast.success(`${selectedFiles.length} archivo(s) subido(s) exitosamente`);
      resetState();
      onOpenChange(false);
      onSuccess?.(uploaded);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Error al subir archivos";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Subir Múltiples Documentos</DialogTitle>
          <DialogDescription>
            Selecciona varios archivos para subir al mismo tiempo
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4 pr-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Archivos *</label>
            <Input
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              className="cursor-pointer"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-medium">
                  {selectedFiles.length} archivo(s) seleccionado(s):
                </p>
                {selectedFiles.map((file, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    • {file.name} ({formatFileSize(file.size)})
                  </p>
                ))}
              </div>
            )}
          </div>

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
            userRole={userRole}
            descriptionLabel="Descripción (opcional)"
            visibilityLabel="Hacer públicos (visible para todos los usuarios)"
            isPublicCheckboxId="isPublicMultiple"
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUploadMultiple} disabled={uploading || selectedFiles.length === 0}>
            {uploading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir {selectedFiles.length} archivo(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
