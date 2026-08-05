"use client";

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

  academicYears: AcademicYear[] | undefined;
  showAcademicYear?: boolean;

  uploadDocumentTypes: DocumentType[] | undefined;
  showDocumentType?: boolean;

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
  academicYears,
  showAcademicYear = true,
  uploadDocumentTypes,
  showDocumentType = true,
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
          Completa primero categoría, tipo y fecha académica.
        </p>
      </div>

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
          <SelectTrigger id="category">
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
          </div>
        )}
      </div>

      {/* Tipo de documento */}
      {showDocumentType && value.categoryId && uploadDocumentTypes && uploadDocumentTypes.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de documento</label>
          <Select
            value={value.documentTypeId?.toString() ?? "none"}
            onValueChange={(v) =>
              onChange({
                ...value,
                documentTypeId: v === "none" ? undefined : parseInt(v),
              })
            }
          >
            <SelectTrigger id="documentType">
              <SelectValue placeholder="Sin tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin tipo</SelectItem>
              {uploadDocumentTypes.map((dt) => (
                <SelectItem key={dt.id} value={dt.id.toString()}>
                  {dt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
