'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsService } from '@/lib/services/workflows.service';
import { categoriesService } from '@/lib/services/categories.service';
import { sectionsService } from '@/lib/services/sections.service';
import { useState } from 'react';
import { WorkflowTemplate, CreateWorkflowTemplateDto } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WorkflowTemplateDialog from './WorkflowTemplateDialog';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  GitBranch,
  Layers,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function WorkflowTemplatesTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // ADMIN y DIRECTOR pueden gestionar plantillas — ADMIN por rol global, DIRECTOR por diseño institucional
  const canManage = user?.role === 'admin' || user?.role === 'rector';
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<WorkflowTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowsService.getTemplates(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoriesService.getActive(),
  });

  const { data: sectionsResponse } = useQuery({
    queryKey: ['sections', 'active'],
    queryFn: () => sectionsService.getAll({ isActive: true }),
  });
  const sections = sectionsResponse?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkflowTemplateDto) => workflowsService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      toast.success('Plantilla creada exitosamente');
      setShowDialog(false);
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear la plantilla');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateWorkflowTemplateDto }) =>
      workflowsService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      toast.success('Plantilla actualizada exitosamente');
      setShowDialog(false);
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar la plantilla');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => workflowsService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      toast.success('Plantilla eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar la plantilla');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      workflowsService.updateTemplate(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      toast.success('Plantilla actualizada');
    },
    onError: () => {
      toast.error('Error al actualizar la plantilla');
    },
  });

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = (data: CreateWorkflowTemplateDto) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: WorkflowTemplate) => {
    setEditingTemplate(template);
    setShowDialog(true);
  };

  const handleDelete = (template: WorkflowTemplate) => {
    setDeleteConfirm(template);
  };

  const handleToggleActive = (template: WorkflowTemplate) => {
    toggleActiveMutation.mutate({ id: template.id, isActive: !template.isActive });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plantillas de Workflow</CardTitle>
              <CardDescription>
                Define los flujos de aprobación reutilizables para documentos
              </CardDescription>
            </div>
            {canManage && (
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {search ? 'No se encontraron plantillas' : 'No hay plantillas de workflow'}
              </p>
              {!search && (
                <p className="text-sm mt-1">
                  Crea una plantilla para definir flujos de aprobación
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Etapas</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{template.stateDefinitions.length} etapas</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.stateDefinitions.map((sd, i) => (
                          <Badge key={i} variant="outline" className="text-xs px-1 py-0">
                            {sd.state}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.sections && template.sections.length > 0
                          ? template.sections.map((s) => (
                              <Badge key={s.id} variant="outline">{s.name}</Badge>
                            ))
                          : null}
                        {template.category && (
                          <Badge variant="secondary">{template.category.name}</Badge>
                        )}
                        {(!template.sections || template.sections.length === 0) && !template.category && (
                          <span className="text-muted-foreground text-sm">Todos</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{template._count?.workflows ?? 0} workflows</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(template.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(template)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                            {template.isActive ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(template)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WorkflowTemplateDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        categories={categories}
        sections={sections}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar plantilla de workflow"
        description={`¿Eliminar la plantilla "${deleteConfirm?.name}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </>
  );
}
