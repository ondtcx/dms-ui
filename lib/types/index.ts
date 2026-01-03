export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  MODERATOR = "moderator",
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
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
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: number;
  documentId: number;
  version: number;
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

export interface Document {
  id: number;
  filename: string;
  storedName: string;
  mimetype: string;
  size: number;
  path: string;
  description: string | null;
  categoryId: number | null;
  category: Category | null;
  isPublic: boolean;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  uploadedById: string;
  templateId: number | null;
  template?: {
    id: number;
    name: string;
    type: string;
  };
  formData: Record<string, unknown> | null;
  currentVersion: number;
  versions?: DocumentVersion[];
  checksumSHA256: string | null;
  deletedAt: string | null;
  deletedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  deletedById: string | null;
  accesses?: DocumentAccess[];
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

export interface UploadDocumentDto {
  description?: string;
  categoryId?: number;
  isPublic?: boolean;
}

export interface CategoryCount {
  categoryId: number;
  categoryName: string;
  count: number;
}

export * from './templates';
