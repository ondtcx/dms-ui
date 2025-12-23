# Guía de Implementación - Sistema de Plantillas de Documentos

Esta guía te ayudará a integrar el sistema de plantillas de documentos en tu frontend Next.js.

## 📋 Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Actualizar Tipos TypeScript](#actualizar-tipos-typescript)
3. [Crear Servicio de API](#crear-servicio-de-api)
4. [Crear Página de Plantillas](#crear-página-de-plantillas)
5. [Crear Componente de Generación](#crear-componente-de-generación)
6. [Integrar en el Dashboard](#integrar-en-el-dashboard)
7. [Pruebas](#pruebas)

---

## 1. Prerequisitos

Asegúrate de que:
- ✅ El backend esté corriendo en `http://localhost:3000`
- ✅ Las plantillas de ejemplo estén cargadas (ejecutar `npm run seed` en el backend)
- ✅ El frontend esté configurado para usar `http://localhost:3000/api` como `NEXT_PUBLIC_API_URL`

---

## 2. Actualizar Tipos TypeScript

### Archivo: `lib/types/index.ts`

Agrega los siguientes tipos al final del archivo existente:

```typescript
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
  isActive?: boolean;
}

export interface UpdateDocumentTemplateDto {
  name?: string;
  type?: string;
  description?: string;
  fields?: TemplateFields;
  isActive?: boolean;
}

export interface CreateDocumentFromTemplateDto {
  templateId: number;
  formData: Record<string, any>;
  filename?: string;
  description?: string;
  isPublic?: boolean;
}

export interface TemplateType {
  type: string;
  count: number;
}

// Actualizar interfaz Document para incluir campos de template
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
  templateId: number | null;  // NUEVO
  template?: {               // NUEVO
    id: number;
    name: string;
    type: string;
  };
  formData: Record<string, any> | null;  // NUEVO
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Crear Servicio de API

### Archivo: `lib/services/templates.service.ts`

```typescript
import api from "@/lib/axios";
import {
  DocumentTemplate,
  DocumentTemplatesResponse,
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
  CreateDocumentFromTemplateDto,
  TemplateType,
  Document,
} from "@/lib/types";

export const templatesService = {
  /**
   * Listar plantillas con filtros y paginación
   */
  async getAll(params?: {
    search?: string;
    type?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<DocumentTemplatesResponse> {
    const response = await api.get<DocumentTemplatesResponse>(
      "/document-templates",
      { params }
    );
    return response.data;
  },

  /**
   * Obtener una plantilla específica por ID
   */
  async getOne(id: number): Promise<DocumentTemplate> {
    const response = await api.get<DocumentTemplate>(
      `/document-templates/${id}`
    );
    return response.data;
  },

  /**
   * Obtener tipos de plantillas disponibles
   */
  async getTypes(): Promise<TemplateType[]> {
    const response = await api.get<TemplateType[]>(
      "/document-templates/types"
    );
    return response.data;
  },

  /**
   * Crear una nueva plantilla
   */
  async create(
    data: CreateDocumentTemplateDto
  ): Promise<DocumentTemplate> {
    const response = await api.post<DocumentTemplate>(
      "/document-templates",
      data
    );
    return response.data;
  },

  /**
   * Actualizar una plantilla existente
   */
  async update(
    id: number,
    data: UpdateDocumentTemplateDto
  ): Promise<DocumentTemplate> {
    const response = await api.patch<DocumentTemplate>(
      `/document-templates/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Eliminar una plantilla
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/document-templates/${id}`
    );
    return response.data;
  },

  /**
   * Crear un documento desde una plantilla
   */
  async createDocumentFromTemplate(
    data: CreateDocumentFromTemplateDto
  ): Promise<Document> {
    const response = await api.post<Document>(
      "/documents/from-template",
      data
    );
    return response.data;
  },
};
```

---

## 4. Crear Página de Plantillas

### Archivo: `app/dashboard/templates/page.tsx`

Crea este archivo con el contenido del anexo [TEMPLATES_PAGE.tsx](#anexo-templates_pagetsx)

---

## 5. Crear Componente de Generación de Documentos

### Archivo: `components/templates/CreateDocumentFromTemplateDialog.tsx`

Crea este archivo con el contenido del anexo [CREATE_DOCUMENT_DIALOG.tsx](#anexo-create_document_dialogtsx)

---

## 6. Integrar en el Dashboard

### Actualizar: `app/dashboard/layout.tsx`

Agrega el enlace a plantillas en tu sidebar/navigation:

```typescript
// Agregar en tu array de navegación
{
  name: "Plantillas",
  href: "/dashboard/templates",
  icon: FileTemplate, // Importar: import { FileTemplate } from "lucide-react"
}
```

### Actualizar: `app/dashboard/documents/page.tsx`

Agrega un botón para crear documentos desde plantillas:

```typescript
// En la sección de botones, agregar:
import Link from "next/link";
import { FileTemplate } from "lucide-react";

// Dentro del componente:
<div className="flex gap-2">
  <Link href="/dashboard/templates">
    <Button variant="outline">
      <FileTemplate className="mr-2 h-4 w-4" />
      Desde Plantilla
    </Button>
  </Link>

  <Button onClick={() => setShowUploadModal(true)}>
    <Upload className="mr-2 h-4 w-4" />
    Subir Documento
  </Button>
</div>
```

---

## 7. Pruebas

### 7.1 Probar Listado de Plantillas

1. Navega a `/dashboard/templates`
2. Deberías ver las 8 plantillas predefinidas
3. Prueba filtrar por tipo y búsqueda

### 7.2 Probar Generación de Documento

1. En la página de plantillas, haz clic en "Usar" en cualquier plantilla
2. Completa el formulario dinámico
3. Haz clic en "Generar Documento"
4. Verifica que el documento se creó en `/dashboard/documents`

### 7.3 Probar Creación de Plantilla

1. Haz clic en "Nueva Plantilla"
2. Completa el formulario
3. Agrega campos personalizados
4. Guarda y verifica que aparece en la lista

---

## 📝 Anexos

### Anexo: TEMPLATES_PAGE.tsx

Ver archivo completo en: `app/dashboard/templates/page.tsx`

(Este archivo será creado en el siguiente paso)

### Anexo: CREATE_DOCUMENT_DIALOG.tsx

Ver archivo completo en: `components/templates/CreateDocumentFromTemplateDialog.tsx`

(Este archivo será creado en el siguiente paso)

---

## 🎯 Resumen de Archivos a Crear/Modificar

### Crear:
- ✅ `lib/services/templates.service.ts`
- ✅ `app/dashboard/templates/page.tsx`
- ✅ `components/templates/CreateDocumentFromTemplateDialog.tsx`

### Modificar:
- ✅ `lib/types/index.ts` (agregar tipos)
- ✅ `app/dashboard/layout.tsx` (agregar navegación)
- ✅ `app/dashboard/documents/page.tsx` (agregar botón)

---

## 🚀 Siguiente Paso

Ejecuta el siguiente comando para ver la implementación completa:

```bash
# En tu terminal
cd C:\projects\dms-ui
npm run dev
```

Luego navega a: `http://localhost:3001/dashboard/templates`
