"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  FileType,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Eye,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DocumentTemplate } from "@/lib/types";
import { CreateDocumentFromTemplateDialog } from "@/components/templates/CreateDocumentFromTemplateDialog";
import { CreateTemplateDialog } from "@/components/templates/CreateTemplateDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [showCreateDocDialog, setShowCreateDocDialog] = useState(false);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] =
    useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<DocumentTemplate | null>(null);

  // Queries
  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", searchTerm, typeFilter],
    queryFn: () =>
      templatesService.getAll({
        search: searchTerm || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        page: 1,
        limit: 50,
      }),
  });

  const { data: types } = useQuery({
    queryKey: ["template-types"],
    queryFn: () => templatesService.getTypes(),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: templatesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-types"] });
      toast.success("Plantilla eliminada exitosamente");
    },
    onError: () => {
      toast.error("Error al eliminar plantilla");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      templatesService.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Plantilla actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar plantilla");
    },
  });

  // Handlers
  const handleUseTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowCreateDocDialog(true);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setShowCreateTemplateDialog(true);
  };

  const handleDeleteTemplate = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${name}"?`)) return;
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const handleCreateTemplateSuccess = () => {
    setShowCreateTemplateDialog(false);
    setEditingTemplate(null);
  };

  const handleCreateDocumentSuccess = () => {
    setShowCreateDocDialog(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Plantillas de Documentos
        </h1>
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

      {/* Barra de acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por tipo */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {types?.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botón nueva plantilla */}
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setShowCreateTemplateDialog(true);
              }}
            >
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
            <FileType className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay plantillas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu primera plantilla para comenzar
            </p>
          </div>
        ) : (
          templates?.data.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline" className="mt-1">
                        {template.type}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleToggleActive(template.id, template.isActive)
                      }
                      title={
                        template.isActive ? "Desactivar" : "Activar"
                      }
                    >
                      {template.isActive ? (
                        <Power className="h-4 w-4 text-green-600" />
                      ) : (
                        <PowerOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {template.description || "Sin descripción"}
                </p>

                <Separator />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {template.fields.fields.length} campos
                  </span>
                  <span>{template._count?.documents || 0} docs</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    disabled={!template.isActive}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Usar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDeleteTemplate(template.id, template.name)
                    }
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo para crear documento desde plantilla */}
      {selectedTemplate && (
        <CreateDocumentFromTemplateDialog
          open={showCreateDocDialog}
          onOpenChange={setShowCreateDocDialog}
          template={selectedTemplate}
          onSuccess={handleCreateDocumentSuccess}
        />
      )}

      {/* Diálogo para crear/editar plantilla */}
      <CreateTemplateDialog
        open={showCreateTemplateDialog}
        onOpenChange={(open) => {
          setShowCreateTemplateDialog(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSuccess={handleCreateTemplateSuccess}
      />
    </div>
  );
}
