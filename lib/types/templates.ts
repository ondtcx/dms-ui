// ========================================
// TIPOS PARA PLANTILLAS DE DOCUMENTOS
// ========================================

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'number' | 'email';
  required: boolean;
}

export interface TemplateFields {
  fields: TemplateField[];
}

export interface DocumentType {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  isActive: boolean;
  /** The persisted `Documento general` type; authoritative default marker. */
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string; color: string; icon: string } | null;
  _count?: { documents: number };
}

/**
 * Resolves the persisted default document type (`Documento general`) from an
 * active-types list. The `isDefault` flag is the only source of truth; the
 * frontend never fetches a dedicated default endpoint.
 */
export function findDefaultDocumentType<T extends { isDefault?: boolean }>(
  types: readonly T[] | null | undefined,
): T | undefined {
  return types?.find((type) => type.isDefault === true);
}

export interface CreateDocumentTypeDto {
  name: string;
  description?: string;
  categoryId?: number | null;
  isActive?: boolean;
}

export interface UpdateDocumentTypeDto {
  name?: string;
  description?: string;
  categoryId?: number | null;
  isActive?: boolean;
}

export interface DocumentTemplate {
  id: number;
  name: string;
  documentTypeId: number | null;
  documentType: { id: number; name: string } | null;
  description: string | null;
  fields: TemplateFields;
  htmlTemplate: string;
  styles: string | null;
  outputFormat: 'pdf' | 'docx' | 'html';
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  isActive: boolean;
  categoryId: number | null;
  category: {
    id: number;
    name: string;
    color: string;
    icon: string;
    allowedRoles: string[];
  } | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
  };
}

export interface DocumentTemplatesResponse {
  data: DocumentTemplate[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateDocumentTemplateDto {
  name: string;
  documentTypeId?: number | null;
  description?: string;
  fields: TemplateFields;
  htmlTemplate: string;
  styles?: string;
  outputFormat?: 'pdf' | 'docx' | 'html';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  isActive?: boolean;
  categoryId?: number;
}

export interface UpdateDocumentTemplateDto {
  name?: string;
  documentTypeId?: number | null;
  description?: string;
  fields?: TemplateFields;
  htmlTemplate?: string;
  styles?: string;
  outputFormat?: 'pdf' | 'docx' | 'html';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  isActive?: boolean;
  categoryId?: number;
}

export interface CreateDocumentFromTemplateDto {
  templateId: number;
  formData: Record<string, unknown>;
  filename?: string;
  description?: string;
  categoryId?: number;
  academicYearId?: number;
  isPublic?: boolean;
}
