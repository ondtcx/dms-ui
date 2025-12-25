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

export interface DocumentTemplate {
  id: number;
  name: string;
  type: string;
  description: string | null;
  fields: TemplateFields;
  htmlTemplate: string;
  styles: string | null;
  outputFormat: 'pdf' | 'docx' | 'html';
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  isActive: boolean;
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
  type: string;
  description?: string;
  fields: TemplateFields;
  htmlTemplate: string;
  styles?: string;
  outputFormat?: 'pdf' | 'docx' | 'html';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  isActive?: boolean;
}

export interface UpdateDocumentTemplateDto {
  name?: string;
  type?: string;
  description?: string;
  fields?: TemplateFields;
  htmlTemplate?: string;
  styles?: string;
  outputFormat?: 'pdf' | 'docx' | 'html';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  isActive?: boolean;
}

export interface CreateDocumentFromTemplateDto {
  templateId: number;
  formData: Record<string, unknown>;
  filename?: string;
  description?: string;
  isPublic?: boolean;
  categoryId?: number;
}

export interface TemplateType {
  type: string;
  count: number;
}
