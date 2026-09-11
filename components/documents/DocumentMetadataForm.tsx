"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UploadMetadata } from "@/lib/types";

interface DocumentType {
  id: number;
  name: string;
}

interface DocumentMetadataFormProps {
  [key: string]: unknown;
  value: UploadMetadata;
  onChange: (value: UploadMetadata) => void;
  uploadDocumentTypes: DocumentType[] | undefined;
  documentTypeError?: string;
}

export function DocumentMetadataForm({
  value,
  onChange,
  uploadDocumentTypes,
  documentTypeError,
}: DocumentMetadataFormProps) {
  return (
    <div className="space-y-2">
      {/* Tipo de documento */}
      <label htmlFor="documentType" className="text-sm font-medium">
        Tipo de documento <span className="text-red-500">*</span>
      </label>
      <Select
        value={value.documentTypeId?.toString() ?? ""}
        onValueChange={(v) =>
          onChange({
            ...value,
            documentTypeId: parseInt(v),
          })
        }
      >
        <SelectTrigger id="documentType" aria-invalid={Boolean(documentTypeError)}>
          <SelectValue placeholder="Selecciona un tipo de documento" />
        </SelectTrigger>
        <SelectContent>
          {uploadDocumentTypes?.map((dt) => (
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
    </div>
  );
}
