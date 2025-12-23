# Guía Rápida - Implementación de Plantillas

## 🚀 Pasos de Implementación

### Paso 1: Exportar los nuevos tipos

Actualiza `lib/types/index.ts`:

```typescript
// Al final del archivo, agregar:
export * from './templates';
```

### Paso 2: Actualizar el tipo Document

En `lib/types/index.ts`, actualiza la interfaz `Document`:

```typescript
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
  templateId: number | null;  // AGREGAR
  template?: {               // AGREGAR
    id: number;
    name: string;
    type: string;
  };
  formData: Record<string, any> | null;  // AGREGAR
  createdAt: string;
  updatedAt: string;
}
```

### Paso 3: Crear página de plantillas

Crea el archivo `app/dashboard/templates/page.tsx`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
import { useState } from "react";
import { FileTemplate, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", searchTerm],
    queryFn: () =>
      templatesService.getAll({
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
      }),
  });

  const { data: types } = useQuery({
    queryKey: ["template-types"],
    queryFn: () => templatesService.getTypes(),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plantillas de Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Crea y gestiona plantillas para generar documentos estructurados
        </p>
      </div>

      {/* Estadísticas de tipos */}
      {types && types.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {types.map((type) => (
            <Badge key={type.type} variant="outline">
              {type.type}: {type.count} plantilla(s)
            </Badge>
          ))}
        </div>
      )}

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de plantillas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : templates?.data.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <FileTemplate className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay plantillas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primera plantilla para comenzar
            </p>
          </div>
        ) : (
          templates?.data.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Tipo: {template.type}
                    </CardDescription>
                  </div>
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description || "Sin descripción"}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{template.fields.fields.length} campos</span>
                  <span>{template._count?.documents || 0} documentos</span>
                </div>
                <Button className="w-full" size="sm">
                  Usar Plantilla
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

### Paso 4: Agregar ruta al dashboard

En `app/dashboard/layout.tsx`, agrega el enlace de navegación:

```typescript
import { FileTemplate } from "lucide-react";

// En tu array de navegación, agrega:
{
  name: "Plantillas",
  href: "/dashboard/templates",
  icon: FileTemplate,
}
```

### Paso 5: Verificar variables de entorno

Asegúrate de que `.env.local` tenga:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Paso 6: Probar

1. Inicia el backend:
   ```bash
   cd C:\Users\diego\projects\dms
   npm run start:dev
   ```

2. Inicia el frontend:
   ```bash
   cd C:\projects\dms-ui
   npm run dev
   ```

3. Navega a: `http://localhost:3001/dashboard/templates`

---

## 📋 Resumen de Archivos Creados

### ✅ Ya creados por mí:
- `lib/services/templates.service.ts`
- `lib/types/templates.ts`
- `IMPLEMENTATION_GUIDE.md`
- `QUICK_START.md`

### 📝 Debes crear tú:
1. `app/dashboard/templates/page.tsx` (código arriba)
2. Actualizar `lib/types/index.ts` (agregar export)
3. Actualizar interfaz `Document` en `lib/types/index.ts`
4. Actualizar navegación en `app/dashboard/layout.tsx`

---

## 🎯 Funcionalidades Básicas Implementadas

Con estos cambios tendrás:
- ✅ Listado de plantillas
- ✅ Búsqueda de plantillas
- ✅ Vista de tipos de plantillas
- ✅ Vista de detalles de cada plantilla

---

## 🔜 Próximos Pasos (Opcional)

Para funcionalidad completa, puedes agregar:
- Diálogo para crear documentos desde plantilla
- Formulario dinámico basado en campos de la plantilla
- Creación y edición de plantillas
- Filtros avanzados

¿Necesitas ayuda con alguna de estas funcionalidades adicionales? ¡Avísame!
