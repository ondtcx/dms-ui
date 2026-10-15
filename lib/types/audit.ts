/**
 * Client contract for the per-document audit trail exposed by
 * `GET /documents/:id/audit`.
 *
 * The Action/Resource unions mirror the stable backend enum values so the UI
 * can label and filter events without depending on raw display strings.
 */

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "DOWNLOAD",
  "SHARE",
  "REVOKE",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "REQUEST_CHANGES",
  "CANCEL",
  "COMPLETE",
  "REASSIGN",
  "RESTORE",
  "ARCHIVE",
  "LOGIN",
  "LOGOUT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_RESOURCES = [
  "DOCUMENT",
  "DOCUMENT_VERSION",
  "DOCUMENT_TEMPLATE",
  "WORKFLOW",
  "USER",
  "ROLE",
  "PERMISSION",
  "DIRECTORY",
  "CATEGORY",
  "SECTION",
  "SHARE",
  "SESSION",
  "SYSTEM",
] as const;

export type AuditResource = (typeof AUDIT_RESOURCES)[number];

/** Sanitized event detail. Sensitive keys are already redacted by the backend. */
export type AuditMetadata = Record<string, unknown> | null;

export interface DocumentAuditEvent {
  id: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string | null;
  documentId: number | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: AuditMetadata;
  createdAt: string;
}

export interface DocumentAuditQuery {
  page?: number;
  limit?: number;
}

/** Backend wire shape for `GET /documents/:id/audit`. The backend omits `totalPages`. */
export interface DocumentAuditPageWire {
  data: DocumentAuditEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/** Normalized page used by the UI, guaranteed to carry `totalPages`. */
export interface DocumentAuditPage {
  data: DocumentAuditEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
