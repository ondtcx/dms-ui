"use client";

import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { inferredYearPreview } from "@/lib/upload-date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AcademicYear, DocumentType, UploadMetadata } from "@/lib/types";
import { findDefaultDocumentType } from "@/lib/types";

/** Only the fields the metadata form needs from a document type. */
type DocumentTypeOption = Pick<DocumentType, "id" | "name" | "isDefault">;

interface DocumentMetadataFormProps {
  [key: string]: unknown;
  value: UploadMetadata;
  onChange: (value: UploadMetadata) => void;
  uploadDocumentTypes: DocumentTypeOption[] | undefined;
  documentTypeError?: string;
  academicYears?: AcademicYear[];
  disabled?: boolean;
}

export function DocumentMetadataForm({
  value,
  onChange,
  uploadDocumentTypes,
  documentTypeError,
  academicYears,
  disabled = false,
}: DocumentMetadataFormProps) {
  // El predeterminado persistido (`Documento general`) nunca aparece en el
  // desplegable de tipos concretos.
  const defaultType = findDefaultDocumentType(uploadDocumentTypes);
  const isGeneral =
    defaultType !== undefined && value.documentTypeId === defaultType.id;
  const sortedDocumentTypes = [...(uploadDocumentTypes ?? [])]
    .filter((type) => type.isDefault !== true)
    .sort((left, right) =>
      left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );
  const descriptionId = useId();
  const nameId = useId();
  const numberId = useId();
  const descriptionHelpId = `${descriptionId}-help`;
  const academicYearId = useId();
  const documentTypeId = useId();
  const generalTypeId = useId();
  const academicYearHelpId = `${academicYearId}-help`;
  return (
    <div className="space-y-2">
      <label htmlFor={nameId} className="text-sm font-medium">
        Nombre del documento (opcional)
      </label>
      <Input
        id={nameId}
        disabled={disabled}
        value={value.name ?? ""}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        aria-describedby={`${nameId}-help`}
      />
      <p id={`${nameId}-help`} className="text-sm text-muted-foreground">
        Si se deja vacío, se usará el nombre del archivo original.
      </p>
      <label htmlFor={numberId} className="text-sm font-medium">
        Número institucional (opcional)
      </label>
      <Input
        id={numberId}
        disabled={disabled}
        value={value.documentNumber ?? ""}
        onChange={(event) => onChange({ ...value, documentNumber: event.target.value })}
        aria-describedby={`${numberId}-help`}
      />
      <p id={`${numberId}-help`} className="text-sm text-muted-foreground">
        Debe ser único. Si se deja vacío, el documento quedará sin número institucional.
      </p>
      {/* Tipo de documento */}
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={documentTypeId} className="text-sm font-medium">
          Tipo de documento <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <Checkbox
            id={generalTypeId}
            disabled={disabled || defaultType === undefined}
            checked={isGeneral}
            onCheckedChange={(checked) =>
              onChange({
                ...value,
                // `Documento general` = el tipo predeterminado persistido; al
                // desmarcar el usuario debe elegir un tipo concreto.
                documentTypeId: checked === true ? defaultType?.id : undefined,
              })
            }
          />
          <label htmlFor={generalTypeId} className="text-sm font-medium">
            Documento general
          </label>
        </div>
      </div>
      <Select
        disabled={disabled || isGeneral}
        value={isGeneral ? "" : value.documentTypeId?.toString() ?? ""}
        onValueChange={(v) =>
          onChange({
            ...value,
            documentTypeId: parseInt(v),
          })
        }
      >
        <SelectTrigger
          id={documentTypeId}
          aria-required="true"
          aria-invalid={Boolean(documentTypeError)}
        >
          <SelectValue
            placeholder={
              isGeneral ? "Documento general" : "Selecciona un tipo de documento"
            }
          />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="h-60 max-h-60 overflow-y-auto [&_[data-radix-select-viewport]]:h-full"
        >
          {sortedDocumentTypes.map((dt) => (
            <SelectItem key={dt.id} value={dt.id.toString()}>
              {dt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {documentTypeError && (
        <p role="alert" className="text-sm text-destructive">
          {documentTypeError}
        </p>
      )}
      <label htmlFor={academicYearId} className="text-sm font-medium">
        Fecha de origen (opcional)
      </label>
      <Input
        id={academicYearId}
        type="date"
        disabled={disabled}
        value={value.originDate ?? ""}
        onChange={(event) =>
          onChange({ ...value, originDate: event.target.value || undefined })
        }
        aria-describedby={academicYearHelpId}
      />
      <p id={academicYearHelpId} className="text-sm text-muted-foreground">
        {value.originDate
          ? inferredYearPreview(value.originDate, academicYears)
          : `Si se deja vacía, se usará la fecha actual. ${inferredYearPreview(undefined, academicYears)}`}
      </p>
      <label htmlFor={descriptionId} className="text-sm font-medium">
        Descripción (opcional)
      </label>
      <Textarea
        id={descriptionId}
        disabled={disabled}
        value={value.description ?? ""}
        onChange={(event) =>
          onChange({ ...value, description: event.target.value })
        }
        aria-describedby={descriptionHelpId}
      />
      <p id={descriptionHelpId} className="text-sm text-muted-foreground">
        Describe el asunto o contenido del documento para facilitar su
        identificación y búsqueda posterior.
      </p>
    </div>
  );
}
