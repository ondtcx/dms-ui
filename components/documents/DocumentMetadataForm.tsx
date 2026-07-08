"use client";

import { FolderOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AcademicYear, Category, UploadMetadata } from "@/lib/types";

interface Course {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

interface DocumentType {
  id: number;
  name: string;
}

interface DocumentMetadataFormProps {
  value: UploadMetadata;
  onChange: (value: UploadMetadata) => void;

  categories: Category[] | undefined;
  loadingCategories: boolean;
  selectedCategory: Category | undefined;
  showCourseFields: boolean;

  academicYears: AcademicYear[] | undefined;
  showAcademicYear?: boolean;

  uploadDocumentTypes: DocumentType[] | undefined;
  showDocumentType?: boolean;

  allCourses: Course[] | undefined;
  loadingCourses: boolean;

  courseSubjects: Subject[] | undefined;
  loadingSubjects: boolean;

  userRole: string | undefined;

  descriptionLabel?: string;
  visibilityLabel?: string;
  isPublicCheckboxId?: string;
}

export function DocumentMetadataForm({
  value,
  onChange,
  categories,
  loadingCategories,
  selectedCategory,
  showCourseFields,
  academicYears,
  showAcademicYear = true,
  uploadDocumentTypes,
  showDocumentType = true,
  allCourses,
  loadingCourses,
  courseSubjects,
  loadingSubjects,
  userRole,
  descriptionLabel = "Descripción",
  visibilityLabel = "Hacer público (visible para todos los usuarios)",
  isPublicCheckboxId = "isPublic",
}: DocumentMetadataFormProps) {
  return (
    <>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Metadatos principales</p>
        <p className="text-xs text-muted-foreground">
          Completa primero título, categoría, tipo y fecha académica.
        </p>
      </div>

      {showTitle && (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="title">{titleLabel} *</label>
          <Input
            id="title"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Ej: Oficio de solicitud de materiales"
          />
          <p className="text-xs text-muted-foreground">
            Este título identifica funcionalmente el documento dentro del sistema.
          </p>
        </div>
      )}

      {/* Categoría */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Categoría</label>
        <Select
          value={value.categoryId?.toString() || ""}
          onValueChange={(v) =>
            onChange({
              ...value,
              categoryId: v ? parseInt(v) : undefined,
              courseId: undefined,
              subjectId: undefined,
            })
          }
        >
          <SelectTrigger id="category" aria-invalid={categoryRequired && !value.categoryId}>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {!loadingCategories &&
              categories
                ?.filter((cat) => {
                  if (!cat.isActive) return false;
                  if (userRole === "admin") return true;
                  if (!cat.allowedRoles || cat.allowedRoles.length === 0) return true;
                  return userRole && cat.allowedRoles.includes(userRole);
                })
                .map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>

        {selectedCategory && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-1.5">
            {selectedCategory.description && (
              <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {selectedCategory.section && (
                <span
                  className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: selectedCategory.section.color,
                    color: selectedCategory.section.color,
                    backgroundColor: `${selectedCategory.section.color}15`,
                  }}
                >
                  {selectedCategory.section.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                Se archivará en:{" "}
                <span className="font-medium text-foreground">
                  {selectedCategory.section?.name ?? "Sin sección"}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tipo de documento */}
      {showDocumentType && value.categoryId && uploadDocumentTypes && uploadDocumentTypes.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tipo de documento {documentTypeRequired ? "*" : ""}
          </label>
          <Select
            value={value.documentTypeId?.toString() ?? (documentTypeRequired ? "" : "none")}
            onValueChange={(v) =>
              onChange({
                ...value,
                documentTypeId: v === "none" ? undefined : parseInt(v),
              })
            }
          >
            <SelectTrigger id="documentType" aria-invalid={documentTypeRequired && !value.documentTypeId}>
              <SelectValue placeholder={documentTypeRequired ? "Selecciona un tipo" : "Sin tipo"} />
            </SelectTrigger>
            <SelectContent>
              {!documentTypeRequired && <SelectItem value="none">Sin tipo</SelectItem>}
              {uploadDocumentTypes.map((dt) => (
                <SelectItem key={dt.id} value={dt.id.toString()}>
                  {dt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {documentTypeRequired && !value.documentTypeId && (
            <p className="text-xs text-destructive">El tipo de documento es obligatorio para esta categoría.</p>
          )}
        </div>
      )}

      {/* Año Lectivo */}
      {showAcademicYear && academicYears && academicYears.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Año Lectivo</label>
          <Select
            value={value.academicYearId?.toString() || "auto"}
            onValueChange={(v) =>
              onChange({
                ...value,
                academicYearId: v === "auto" ? undefined : parseInt(v),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Año activo (por defecto)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Año activo (por defecto)</SelectItem>
              {academicYears
                .filter((y) => y.isActive)
                .map((year) => (
                  <SelectItem key={year.id} value={year.id.toString()}>
                    {year.name}
                    {year.isCurrent ? " (Actual)" : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Para documentos de años anteriores, selecciona el año correspondiente.
          </p>
        </div>
      )}

      {/* Subtipo de documento */}
      {showDocumentType && value.categoryId && uploadDocumentTypes && uploadDocumentTypes.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Subtipo de documento</label>
          <Select
            value={value.documentTypeId?.toString() ?? "none"}
            onValueChange={(v) =>
              onChange({
                ...value,
                documentTypeId: v === "none" ? undefined : parseInt(v),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin subtipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin subtipo</SelectItem>
              {uploadDocumentTypes.map((dt) => (
                <SelectItem key={dt.id} value={dt.id.toString()}>
                  {dt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* Descripción */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{descriptionLabel}</label>
        <Textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Describe el contenido del documento..."
          rows={3}
        />
      </div>

      {/* Visibilidad */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={isPublicCheckboxId}
          checked={value.isPublic}
          onCheckedChange={(checked) =>
            onChange({ ...value, isPublic: checked as boolean })
          }
        />
        <label
          htmlFor={isPublicCheckboxId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {visibilityLabel}
        </label>
      </div>
    </>
  );
}
