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

export interface Document {
  id: number;
  filename: string;
  storedName: string;
  mimetype: string;
  size: number;
  path: string;
  description: string | null;
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
  isPublic?: boolean;
}

// Exportar tipos de plantillas
export * from './templates';
