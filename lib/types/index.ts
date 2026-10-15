export enum UserRole {
  RECTOR = "rector",
  VICERRECTOR = "vicerrector",
  COORDINADOR = "coordinador",
  PROFESOR = "profesor",
  SECRETARIO = "secretario",
  PADRE = "padre",
  ESTUDIANTE = "estudiante",
  MODERADOR = "moderador",
  ADMIN = "admin", // Mantener para compatibilidad
  USER = "user", // Mantener para compatibilidad
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
  roles?: string[];
  catalogRoles?: Pick<CatalogRole, "id" | "key" | "label" | "isActive">[];
  authRevision?: number;
}

export interface Permission {
  id: number;
  key: string;
  label: string;
  isActive: boolean;
}

export interface RolePermission
  extends Partial<Pick<Permission, "id" | "key" | "label">> {
  permission?: Pick<Permission, "id" | "key" | "label">;
}

export interface CatalogRole {
  id: number;
  key: string;
  label: string;
  isActive: boolean;
  assignmentCount?: number;
  permissions?: RolePermission[];
  _count?: { assignments?: number; users?: number };
}

export interface RoleAssignment {
  userId: string;
  roleId: number;
}

export interface RoleMutationDto {
  key?: string;
  label?: string;
  isActive?: boolean;
  permissionKeys?: string[];
}

export interface AuthorizationProfile {
  user: User;
  roles: string[];
  permissions: string[];
  authRevision: number;
}

export interface AuthResponse {
  user: User;
  access_token?: string;
  permissions?: string[];
  roles?: string[];
  authRevision?: number;
}

export interface LoginDto {
  email: string;
  password: string;
  code?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
}
export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
}
export interface TwoFactorEnableResponse {
  enabled: boolean;
  recoveryCodes: string[];
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isActive: boolean;
  prefix: string | null;
  requiresCourse: boolean;
  allowedRoles: string[];
  bypassAcademicYear: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    documentTypes: number;
  };
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  requiresCourse?: boolean;
  allowedRoles?: string[];
  prefix?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  requiresCourse?: boolean;
  allowedRoles?: string[];
  prefix?: string | null;
}

export type VersionRetentionUpdate =
  | { mode: "normal" | "permanent"; preserveUntil?: never }
  | { mode: "until"; preserveUntil: string };

export interface DocumentVersion {
  supersededAt?: string | null;
  retentionGraceUntil?: string | null;
  preservePermanently?: boolean;
  preserveUntil?: string | null;
  expiresAt?: string | null;
  canManageRetention?: boolean;
  isRetentionProtected?: boolean;
  id: number;
  documentId: number;
  version: number;
  filename: string;
  mimetype: string;
  storedName: string;
  path: string;
  size: number;
  pageCount?: number | null;
  checksumSHA256: string | null;
  comment: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdById: string;
  createdAt: string;
  source: DocumentVersionSource;
  workflowId?: number | null;
  approvals?: {
    id: number;
    action: ApprovalAction | null;
    user: { name: string };
  }[];
}

export interface DocumentAccess {
  id: number;
  documentId: number;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface DocumentAcademic {
  id: number;
  documentId: number;
  courseId: number | null;
  course?: { id: number; name: string; code: string } | null;
  subjectId: number | null;
  subject?: { id: number; name: string; code: string } | null;
  academicYearId: number | null;
  academicYear?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSearch {
  id: number;
  documentId: number;
  content: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplateData {
  id: number;
  documentId: number;
  formData: Record<string, unknown> | null;
  generatedHtml: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  sharingSummary?: SharingSummary;
  sharingProvenance?: SharingProvenance[];
  canRequestChanges?: boolean;
  actionCapabilities?: import("@/lib/document-action-capabilities").DocumentActionCapabilities;
  batchCapabilities?: import("@/lib/batch-action-capabilities").BatchActionCapabilities;
  id: number;
  name?: string | null;
  originDate?: string | null;
  warnings?: string[];
  description: string | null;
  categoryId: number | null;
  category: Category | null;
  documentTypeId?: number | null;
  documentType?: { id: number; name: string } | null;
  isPublic: boolean;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  uploadedById: string;
  templateId: number | null;
  template?: {
    id: number;
    name: string;
    documentType?: { id: number; name: string } | null;
  };
  currentVersion: number;
  versions?: DocumentVersion[];
  workflow?: {
    id: number;
    status: WorkflowStatus;
    currentState: string | null;
  } | null;
  batchId?: string | null;
  batch?: { id: string; name: string } | null;
  deletedAt: string | null;
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  deletedById: string | null;
  archivedAt: string | null;
  documentNumber: string | null;
  accesses?: DocumentAccess[];
  isComposite?: boolean;
  academic?: DocumentAcademic | null;
  search?: DocumentSearch | null;
  templateData?: DocumentTemplateData | null;
  createdAt: string;
  updatedAt: string;
  directoryId?: number | null;
  directory?: Directory | null;
}

export interface ResourceCapabilities {
  owner: boolean;
  canView: boolean;
  canEdit: boolean;
  canUploadVersion: boolean;
  canShare: boolean;
}

export interface SharingSummary {
  shared: boolean;
  direct: boolean;
  inherited: boolean;
  public: boolean;
}

export interface SharingProvenance {
  grantId?: number | string | null;
  grantedBy?: { id?: string; name?: string | null; email?: string } | null;
  sourceDirectory?: { id: number; name: string } | null;
  inherited?: boolean;
  public?: boolean;
  ownership?: boolean;
  legacy?: boolean;
  canView?: boolean;
  canEdit?: boolean;
  canUploadVersion?: boolean;
  canShare?: boolean;
  authoritySource?: { grantId?: number | string; directory?: { id: number; name: string } | null };
}

export interface Directory {
  id: number;
  name: string;
  parentId: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  receptionEnabled?: boolean;
  singleDocumentPerParticipant?: boolean;
  navigationOnly?: boolean;
  capabilities?: ResourceCapabilities;
  sharingSummary?: SharingSummary;
  sharingProvenance?: SharingProvenance[];
}

export interface DirectoryNavigationSummary {
  recent: Directory[];
  mostUsed: Directory[];
}

export interface AccessibleDirectoriesResponse {
  data: Directory[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecordDirectoryVisitDto {
  eventId: string;
}

export interface CreateDirectoryDto {
  name: string;
  parentId?: number | null;
}

export interface UpdateDirectoryDto {
  name?: string;
  parentId?: number | null;
}

/**
 * Capacidades de recepción calculadas por el backend para el actor actual.
 * Nunca se derivan del rol global; son la lectura viva de la carpeta.
 */
export interface ReceptionCapabilities {
  configure: boolean;
  manageParticipants: boolean;
  readAll: boolean;
  review: boolean;
  manageDelegates: boolean;
  manageStructure: boolean;
  owner: boolean;
  discover: boolean;
  submit: boolean;
  peerRead: boolean;
}

export interface ReceptionSettings {
  directoryId: number;
  enabled: true;
  singleDocumentPerParticipant: boolean;
  capabilities: ReceptionCapabilities;
}

export interface ConfigureReception {
  enabled: boolean;
  singleDocumentPerParticipant?: boolean;
}

/**
 * Participante directo (usuario) de una carpeta de recepción. El backend solo
 * devuelve el identificador; los nombres se obtienen por búsqueda autorizada.
 */
export interface DirectoryUserParticipant {
  directoryId: number;
  userId: string;
  peerRead: boolean;
}

/** Participante por rol de catálogo (asignación viva). */
export interface DirectoryRoleParticipant {
  directoryId: number;
  roleId: number;
  peerRead: boolean;
}

/** Delegación operativa acotada sobre una carpeta de recepción. */
export interface DirectoryDelegate {
  directoryId: number;
  userId: string;
  full: boolean;
  configure: boolean;
  manageParticipants: boolean;
  readAll: boolean;
  review: boolean;
  manageDelegates: boolean;
  manageStructure: boolean;
}

export interface DirectoryMembership {
  users: DirectoryUserParticipant[];
  roles: DirectoryRoleParticipant[];
  delegates: DirectoryDelegate[];
}

/** Destinatario de usuario devuelto por la búsqueda autorizada acotada. */
export interface DirectoryRecipientUser {
  id: string;
  name: string;
  email: string;
}

/** Destinatario de rol activo devuelto por la búsqueda autorizada acotada. */
export interface DirectoryRecipientRole {
  id: number;
  key: string;
  label: string;
}

/** Carga de participante: exactamente un usuario o un rol, más la visibilidad. */
export interface DirectoryParticipantInput {
  userId?: string;
  roleId?: number;
  peerRead: boolean;
}

export type DirectoryDelegateFlags = Omit<
  DirectoryDelegate,
  "directoryId" | "userId"
>;

export interface DocumentsResponse {
  data: Document[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type DocumentListView =
  | "recent-accessed"
  | "recent-created"
  | "all"
  | "trash";

export interface DashboardDocumentRow
  extends Pick<
    Document,
    "id" | "description" | "documentNumber" | "createdAt" | "updatedAt"
  > {
  uploadedBy: Pick<Document["uploadedBy"], "id" | "name" | "email">;
  category: Pick<Category, "id" | "name" | "color" | "icon"> | null;
  versions: Pick<
    DocumentVersion,
    "id" | "version" | "filename" | "mimetype" | "size"
  >[];
  workflow: Pick<
    NonNullable<Document["workflow"]>,
    "id" | "status" | "currentState"
  > | null;
}

export interface DashboardSummary {
  pendingOfficializationCount: number;
  pendingOfficialization: DashboardDocumentRow[];
  pendingHasMore: boolean;
  recent: DashboardDocumentRow[];
  recentHasMore: boolean;
  generatedAt: string;
}

export interface UploadDocumentDto {
  name?: string;
  documentNumber?: string;
  description?: string;
  originDate?: string;
  categoryId?: number;
  documentTypeId?: number | null;
  courseId?: number;
  subjectId?: number;
  isPublic?: boolean;
  academicYearId?: number;
  directoryId?: number | null;
}

export type UpdateDocumentDto = Omit<UploadDocumentDto, "originDate" | "documentNumber"> & {
  documentNumber?: string | null;
};

export interface CategoryCount {
  categoryId: number;
  categoryName: string;
  count: number;
}

export interface ArchiveStats {
  total: number;
  byCategory: {
    categoryId: number | null;
    categoryName: string;
    categoryColor: string;
    count: number;
  }[];
}

// ===== BATCH OPERATIONS =====

export interface BatchUpdateDto {
  documentIds: number[];
  categoryId?: number;
  courseId?: number;
  subjectId?: number;
  description?: string;
}

export interface BatchDeleteDto {
  documentIds: number[];
  permanent?: boolean;
}

export interface BatchExportDto {
  documentIds: number[];
}

export interface BatchResponse {
  success: boolean;
  updated?: number;
  deleted?: number;
  exported?: number;
  restored?: number;
  permanent?: boolean;
  documentIds: number[];
}

// ===== VERSIONES =====

export enum DocumentVersionSource {
  UPLOAD_INICIAL = "UPLOAD_INICIAL",
  REEMPLAZO_MANUAL = "REEMPLAZO_MANUAL",
  RESTAURACION = "RESTAURACION",
  CAMBIOS_SOLICITADOS = "CAMBIOS_SOLICITADOS",
}

// ===== WORKFLOWS =====

export enum WorkflowStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum ApprovalAction {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REQUESTED_CHANGES = "REQUESTED_CHANGES",
  COMMENTED = "COMMENTED",
}

// ===== SEARCH =====

export interface SearchQueryDto {
  query?: string;
  categoryIds?: number[];
  documentTypeIds?: number[];
  courseIds?: number[];
  subjectIds?: number[];
  uploadedById?: string;
  dateFrom?: string;
  dateTo?: string;
  minSize?: number;
  maxSize?: number;
  mimetypes?: string[];
  isPublic?: boolean;
  includeDeleted?: boolean;
  includeContent?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchResponse {
  data: Document[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SearchHistory {
  id: number;
  userId: string;
  query: string;
  filters: any;
  resultCount: number;
  createdAt: string;
}

// ============ Calendar Types ============

export interface CalendarQueryDto {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
}

export interface CalendarResponse {
  documents: Document[];
  groupedByDate: Record<string, Document[]>;
  totalDocuments: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Document;
  color?: string;
}

// ===== TRANSFERS =====

export enum TransferStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELED = "CANCELED",
}

export interface TransferHistory {
  id: number;
  documentId: number;
  document: {
    id: number;
    versions?: { filename: string; mimetype: string; size: number }[];
    description: string | null;
    category: { id: number; name: string; color: string } | null;
    section: { id: number; name: string; color: string } | null;
  };
  fromUserId: string;
  fromUser: {
    id: string;
    name: string;
    email: string;
  };
  toUserId: string;
  toUser: {
    id: string;
    name: string;
    email: string;
  };
  status: TransferStatus;
  comment: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferDto {
  documentId: number;
  toUserId?: string;
  comment?: string;
}

export interface TransferStats {
  sent: number;
  received: number;
  total: number;
  pending: number;
}

export interface DocumentBatch {
  id: string;
  name: string;
  templateId: number;
  template: { id: number; name: string; type: string };
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  documents?: Document[];
  totalCount: number;
  _count?: { documents: number };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentBatchesResponse {
  data: DocumentBatch[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface BatchRowDto {
  formData: Record<string, unknown>;
  filename?: string;
  description?: string;
}

export interface CreateBatchFromTemplateDto {
  templateId: number;
  batchName?: string;
  rows: BatchRowDto[];
  categoryId?: number;
  isPublic?: boolean;
}

export interface CreateBatchResult {
  batch: DocumentBatch;
  documents: Document[];
  errors: string[];
}

// ===== SHARES =====

export interface DocumentShare {
  id: number;
  documentId: number;
  document: {
    id: number;
    versions?: { filename: string; mimetype: string; size: number }[];
    createdAt: string;
  };
  // Destinatario (solo uno estará presente)
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  role: string | null;
  courseId: number | null;
  course: { id: number; name: string; code: string } | null;
  // Permisos
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canShare: boolean;
  // Link público
  isPublicLink: boolean;
  shareToken: string;
  requiresPassword: boolean;
  // Límites
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  // Auditoría
  sharedBy: { id: string; name: string; email: string };
  sharedById: string;
  revokedAt: string | null;
  revokedBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShareDto {
  documentId: number;
  userId?: string;
  role?: string;
  courseId?: number;
  canView?: boolean;
  canDownload?: boolean;
  canEdit?: boolean;
  canShare?: boolean;
  isPublicLink?: boolean;
  requiresPassword?: boolean;
  password?: string;
  expiresAt?: string;
  maxViews?: number;
}

export * from "./templates";
export * from "./audit";

// ─── Año Lectivo ──────────────────────────────────────────────────────────────

export interface AcademicYear {
  id: number;
  name: string; // "2025-2026"
  startDate: string; // ISO string
  endDate: string; // ISO string
  isCurrent: boolean;
  isActive: boolean;
  _count?: {
    levels: number; // Cursos cuyo campo academicYear coincide con este name
    documents: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicYearListResponse {
  data: AcademicYear[];
  total: number;
}

// ============ COMPOSICIÓN DE DOCUMENTOS ============

export interface CompositionChild {
  id: number;
  versions?: { filename: string; mimetype: string }[];
  templateId: number | null;
  documentNumber: string | null;
  category: { id: number; name: string; color: string } | null;
}

export interface DocumentCompositionItem {
  id: number;
  parentId: number;
  childId: number;
  child: CompositionChild;
  order: number;
  label: string | null;
  insertAfterPage: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentComposition {
  id: number;
  isComposite: boolean;
  components: DocumentCompositionItem[];
  partOf: {
    id: number;
    parent: {
      id: number;
      versions?: { filename: string }[];
      documentNumber: string | null;
    };
  }[];
}

// ===== AUTH - PASSWORD RESET & CHANGE =====

export interface GenerateResetTokenDto {
  userId: string;
}

export interface ResetTokenResponse {
  token: string;
  expiresAt: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ─── Upload Metadata ──────────────────────────────────────────────────────────

export interface UploadMetadata {
  name?: string;
  documentNumber?: string;
  categoryId: number | undefined;
  originDate?: string;
  documentTypeId: number | null | undefined;
  description?: string;
  isPublic: boolean;
  directoryId?: number | null;
}

export const EMPTY_UPLOAD_METADATA: UploadMetadata = {
  categoryId: undefined,
  documentTypeId: undefined,
  isPublic: false,
  directoryId: null,
};
