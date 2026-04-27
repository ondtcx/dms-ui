export interface RoleSummary {
  id: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  permissions?: { action: string }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId?: string | null;
  role: string;
  roleSummary?: RoleSummary | null;
  legacyRoleName?: string | null;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface LoginDto {
  email: string;
  password: string;
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
  sectionId: number | null;
  section?: { id: number; name: string; color: string; icon: string } | null;
  requiresCourse: boolean;
  roleIds?: string[]; // UUIDs
  roles?: { roleId: string; role: RoleSummary }[]; // relation data
  bypassAcademicYear: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    documentTypes: number;
  };
}

export interface Section {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isActive: boolean;
  prefix: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    categories: number;
  };
}

export interface SectionStats {
  id: number;
  name: string;
  color: string;
  icon: string;
  categoryCount: number;
  documentCount: number;
}

export interface SectionsResponse {
  data: Section[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateSectionDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  prefix?: string;
}

export interface UpdateSectionDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  prefix?: string | null;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  sectionId?: number | null;
  requiresCourse?: boolean;
  roleIds?: string[];
  prefix?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  sectionId?: number | null;
  requiresCourse?: boolean;
  roleIds?: string[];
  prefix?: string | null;
}

export interface DocumentVersion {
  id: number;
  documentId: number;
  version: number;
  filename: string;
  mimetype: string;
  storedName: string;
  path: string;
  size: number;
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
  id: number;
  title: string | null;
  description: string | null;
  documentDate: string | null;
  sender: string | null;
  recipient: string | null;
  keywords: string | null;
  status: PilotDocumentStatus;
  physicalBuilding: string | null;
  physicalOffice: string | null;
  physicalArchive: string | null;
  physicalBox: string | null;
  physicalNotes: string | null;
  categoryId: number | null;
  category: (Category & { section?: { id: number; name: string; color: string; icon: string } | null }) | null;
  documentTypeId?: number | null;
  documentType?: { id: number; name: string } | null;
  isPublic: boolean;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
    role?: string | RoleSummary;
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
}

export interface DocumentsResponse {
  data: Document[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type DocumentModalityFilter = 'PHYSICAL' | 'DIGITAL';

export interface UploadDocumentDto {
  title?: string;
  description?: string;
  documentDate?: string;
  sender?: string;
  recipient?: string;
  keywords?: string;
  status?: PilotDocumentStatus;
  physicalBuilding?: string;
  physicalOffice?: string;
  physicalArchive?: string;
  physicalBox?: string;
  physicalNotes?: string;
  categoryId?: number;
  documentTypeId?: number;
  sectionId?: number;
  courseId?: number;
  subjectId?: number;
  isPublic?: boolean;
  academicYearId?: number;
}

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
  UPLOAD_INICIAL      = 'UPLOAD_INICIAL',
  REEMPLAZO_MANUAL    = 'REEMPLAZO_MANUAL',
  RESTAURACION        = 'RESTAURACION',
  CAMBIOS_SOLICITADOS = 'CAMBIOS_SOLICITADOS',
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

export interface StateDefinition {
  state: string;
  roleId: string;
  role?: RoleSummary;
  order: number;
  requiresComment?: boolean;
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  category?: Category;
  sections?: Section[];
  stateDefinitions: StateDefinition[];
  autoAssign: boolean;
  requiresComment: boolean;
  initiatorRoleIds: string[];
  initiatorRoles?: { roleId: string; role: RoleSummary }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { workflows: number };
}

export interface CreateWorkflowTemplateDto {
  name: string;
  description?: string;
  categoryId?: number;
  sectionIds?: number[];
  stateDefinitions: StateDefinition[];
  autoAssign?: boolean;
  requiresComment?: boolean;
  initiatorRoleIds?: string[];
  isActive?: boolean;
}

export type UpdateWorkflowTemplateDto = Partial<CreateWorkflowTemplateDto>;

export interface DocumentWorkflow {
  id: number;
  documentId: number;
  document?: Document;
  templateId: number | null;
  template?: WorkflowTemplate;
  status: WorkflowStatus;
  currentState: string | null;
  currentStateOrder: number | null;
  initiatedBy: {
    id: string;
    name: string;
    email: string;
  };
  initiatedById: string;
  approvals?: WorkflowApproval[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowApproval {
  id: number;
  workflowId: number;
  state: string;
  stateOrder: number;
  action: ApprovalAction | null;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===== NOTIFICATIONS =====

export enum NotificationType {
  DOCUMENT_SHARED = "DOCUMENT_SHARED",
  APPROVAL_REQUESTED = "APPROVAL_REQUESTED",
  APPROVAL_APPROVED = "APPROVAL_APPROVED",
  APPROVAL_REJECTED = "APPROVAL_REJECTED",
  COMMENT_ADDED = "COMMENT_ADDED",
  MENTION = "MENTION",
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED",
  PERMISSION_GRANTED = "PERMISSION_GRANTED",
}

export enum NotificationStatus {
  UNREAD = "UNREAD",
  READ = "READ",
  ARCHIVED = "ARCHIVED",
}

export interface Notification {
  id: number;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  documentId: number | null;
  workflowId: number | null;
  commentId: number | null;
  actionUrl: string | null;
  emailSent: boolean;
  emailSentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  userId: string;
  inAppEnabled: boolean;
  emailSettings: any;
  enableDigest: boolean;
  digestFrequency: string | null;
}

// ===== COMMENTS =====

export interface DocumentComment {
  id: number;
  documentId: number;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  content: string;
  parentId: number | null;
  replies?: DocumentComment[];
  mentions: any;
  annotationData: any;
  isEdited: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reactions?: CommentReaction[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentReaction {
  id: number;
  commentId: number;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  emoji: string;
  createdAt: string;
}

export interface CreateCommentDto {
  documentId: number;
  content: string;
  parentId?: number;
  mentions?: string[];
  annotationData?: any;
}

// ===== SEARCH =====

export interface SearchQueryDto {
  query?: string;
  categoryIds?: number[];
  sectionIds?: number[];
  departmentIds?: number[];
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
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

// ===== REPORTS =====

export interface DashboardReport {
  summary: {
    totalDocuments: {
      total: number;
      active: number;
      deleted: number;
    };
    totalUsers: {
      total: number;
      byRole: {
        role: string;
        count: number;
      }[];
    };
    totalStorage: {
      total: number;
      average: number;
      max: number;
      byDepartment: {
        department: string;
        documentCount: number;
        totalSize: number;
      }[];
    };
  };
  charts: {
    recentUploads: {
      date: string;
      count: number;
    }[];
    categoryDistribution: {
      categoryId: number | null;
      categoryName: string;
      color: string;
      count: number;
    }[];
    userActivity: {
      userId: string;
      userName: string;
      role: string;
      documentCount: number;
    }[];
    workflowStats: {
      total: number;
      byStatus: {
        status: WorkflowStatus;
        count: number;
      }[];
      avgCompletionTime: number;
    };
  };
  executionTime: number;
}

export interface WorkflowBottleneck {
  workflowId: number;
  documentId: number;
  documentName: string;
  templateName: string;
  currentState: string | null;
  daysPending: number;
  createdAt: string;
}

export interface DocumentCompliance {
  category: string;
  documentCount: number;
  complianceRate: number;
}

// ============ Calendar Types ============

export interface CalendarQueryDto {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  sectionId?: number;
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
    department: { id: number; name: string } | null;
  };
  toUserId: string;
  toUser: {
    id: string;
    name: string;
    email: string;
    department: { id: number; name: string } | null;
  };
  toDepartmentId: number | null;
  toDepartment: { id: number; name: string } | null;
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
  toDepartmentId?: number;
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
  sectionId?: number;
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
  roleId: string | null;
  role: string | null;
  roleSummary?: RoleSummary | null;
  legacyRoleName?: string | null;
  departmentId: number | null;
  department: { id: number; name: string } | null;
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
  roleId?: string;
  departmentId?: number;
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

export * from './templates';

// ─── Año Lectivo ──────────────────────────────────────────────────────────────

export interface AcademicYear {
  id: number;
  name: string;       // "2025-2026"
  startDate: string;  // ISO string
  endDate: string;    // ISO string
  isCurrent: boolean;
  isActive: boolean;
  _count?: {
    levels: number;   // Cursos cuyo campo academicYear coincide con este name
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
    parent: { id: number; versions?: { filename: string }[]; documentNumber: string | null };
  }[];
}

// ─── Upload Metadata ──────────────────────────────────────────────────────────

export interface UploadMetadata {
  title: string;
  categoryId: number | undefined;
  courseId: number | undefined;
  subjectId: number | undefined;
  academicYearId: number | undefined;
  documentTypeId: number | undefined;
  documentDate: string;
  sender: string;
  recipient: string;
  description: string;
  keywords: string;
  status: PilotDocumentStatus;
  physicalBuilding: string;
  physicalOffice: string;
  physicalArchive: string;
  physicalBox: string;
  physicalNotes: string;
  isPublic: boolean;
}

export type PilotDocumentStatus = 'REGISTRADO' | 'EN_REVISION' | 'ARCHIVADO';

export interface DocumentType {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
  categoryId: number;
  category?: {
    id: number;
    name: string;
    color?: string;
    icon?: string;
  } | null;
}

export const EMPTY_UPLOAD_METADATA: UploadMetadata = {
  title: "",
  categoryId: undefined,
  courseId: undefined,
  subjectId: undefined,
  academicYearId: undefined,
  documentTypeId: undefined,
  documentDate: "",
  sender: "",
  recipient: "",
  description: "",
  keywords: "",
  status: 'REGISTRADO',
  physicalBuilding: "",
  physicalOffice: "",
  physicalArchive: "",
  physicalBox: "",
  physicalNotes: "",
  isPublic: false,
};
