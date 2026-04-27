import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const mimeTypeLabels: Record<string, string> = {
  // Documentos
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.oasis.opendocument.text": "OpenDocument",
  "application/vnd.oasis.opendocument.spreadsheet": "OpenDocument Hoja",
  "application/vnd.oasis.opendocument.presentation": "OpenDocument Presentación",
  "application/rtf": "RTF",
  // Texto
  "text/plain": "Texto",
  "text/csv": "CSV",
  "text/html": "HTML",
  "text/css": "CSS",
  "text/javascript": "JavaScript",
  // Imágenes
  "image/jpeg": "Imagen JPEG",
  "image/png": "Imagen PNG",
  "image/gif": "Imagen GIF",
  "image/webp": "Imagen WebP",
  "image/svg+xml": "Imagen SVG",
  "image/bmp": "Imagen BMP",
  "image/tiff": "Imagen TIFF",
  // Comprimidos
  "application/zip": "ZIP",
  "application/x-rar-compressed": "RAR",
  "application/x-7z-compressed": "7-Zip",
  "application/gzip": "GZIP",
  // Otros
  "application/json": "JSON",
  "application/xml": "XML",
};

export function formatMimeType(mimetype: string): string {
  const label = mimeTypeLabels[mimetype.toLowerCase()];
  if (label) return label;

  // Fallback: extraer subtipo y simplificar
  const subtype = mimetype.split("/")[1] || mimetype;
  // Quitar prefijos comunes como "vnd.", "x-", etc.
  const cleaned = subtype
    .replace(/^vnd\./, "")
    .replace(/^x-/, "")
    .replace(/^application\//, "");
  // Si sigue siendo muy largo (>20 chars), tomar solo la última parte después de un punto
  if (cleaned.length > 20) {
    const parts = cleaned.split(".");
    return parts[parts.length - 1].toUpperCase();
  }
  return cleaned.toUpperCase();
}

type RoleLike =
  | string
  | {
      id?: string;
      name?: string;
      description?: string | null;
      isSystem?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }
  | null
  | undefined;

const ROLE_LABELS: Record<string, string> = {
  rector: "Rector/a",
  coordinador: "Coordinador/a",
  profesor: "Profesor/a",
  secretario: "Secretario/a",
  padre: "Padre/Madre",
  estudiante: "Estudiante",
  moderador: "Moderador/a",
  admin: "Administrador/a",
  user: "Usuario",
};

export function formatRole(role?: RoleLike): string {
  if (!role) return "";

  const roleName = typeof role === "string" ? role : role.name;
  if (!roleName) return "";

  return ROLE_LABELS[roleName] ?? roleName;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
