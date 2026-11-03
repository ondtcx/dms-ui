export type AuthoringStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'EMITTED'
  | 'ARCHIVED';

export type AuthoringFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'email'
  | 'select'
  | 'checkbox'
  | 'list'
  | 'richtext';

export interface AuthoringField {
  key: string;
  label: string;
  type: AuthoringFieldType;
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
}

export interface AuthoringFieldsSchema {
  fields: AuthoringField[];
}

export interface AuthoringTemplateVersion {
  id: number;
  templateId: number;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  bodyHtml: string;
  styles?: string | null;
  headerHtml?: string | null;
  footerHtml?: string | null;
  marginTop?: string | null;
  marginBottom?: string | null;
  marginLeft?: string | null;
  marginRight?: string | null;
  fields: AuthoringFieldsSchema;
  pageSize: string;
  orientation: string;
  numberPrefix: string;
  createdAt: string;
  publishedAt?: string | null;
}

export interface AuthoringTemplate {
  id: number;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  documentTypeId?: number | null;
  fields: AuthoringFieldsSchema;
  htmlTemplate: string;
  styles?: string | null;
  isActive: boolean;
  catalog: string;
  versions: AuthoringTemplateVersion[];
  category?: { id: number; name: string } | null;
}

export interface AuthoringEvent {
  id: number;
  action: string;
  fromStatus?: AuthoringStatus | null;
  toStatus: AuthoringStatus;
  observation?: string | null;
  actorId: string;
  actorName?: string | null;
  createdAt: string;
}

export interface AuthoringContentVersion {
  id: number;
  version: number;
  reason: string;
  createdById: string;
  createdByName?: string | null;
  createdAt: string;
}

export interface AuthoringDocumentVersion {
  id: number;
  version: number;
  filename: string;
  mimetype: string;
  size: number;
  createdAt: string;
  comment?: string | null;
}

export interface AuthoringDocument {
  id: number;
  name?: string | null;
  description?: string | null;
  documentNumber?: string | null;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  uploadedBy?: { id: string; name?: string | null; email?: string | null; role?: string | null };
  category?: { id: number; name: string } | null;
  versions: AuthoringDocumentVersion[];
  contentVersions: AuthoringContentVersion[];
  authoring: {
    id: number;
    status: AuthoringStatus;
    templateVersionId?: number | null;
    reviewerId?: string | null;
    reviewerName?: string | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    reviewedByName?: string | null;
    reviewObservation?: string | null;
    emittedAt?: string | null;
    emittedByName?: string | null;
    events: AuthoringEvent[];
  };
  templateData?: {
    template?: AuthoringTemplate | null;
    templateVersion?: AuthoringTemplateVersion | null;
    formData?: Record<string, any> | null;
  } | null;
}

export interface AuthoringUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface CreateAuthoringTemplatePayload {
  name: string;
  description?: string;
  bodyHtml: string;
  styles?: string;
  headerHtml?: string;
  footerHtml?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  fields: AuthoringFieldsSchema;
  pageSize?: string;
  orientation?: string;
  numberPrefix: string;
}
