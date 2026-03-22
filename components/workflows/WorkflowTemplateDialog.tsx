'use client';

import { useEffect, useState } from 'react';
import {
  Category,
  CreateWorkflowTemplateDto,
  Section,
  StateDefinition,
  UserRole,
  WorkflowTemplate,
} from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';


const INITIATOR_ROLE_OPTIONS = [
  { value: UserRole.DIRECTOR,    label: 'Director' },
  { value: UserRole.COORDINADOR, label: 'Coordinador' },
  { value: UserRole.PROFESOR,    label: 'Profesor' },
  { value: UserRole.SECRETARIO,  label: 'Secretario' },
];

const APPROVER_ROLE_LABELS: Record<string, string> = {
  [UserRole.DIRECTOR]:    'Director',
  [UserRole.COORDINADOR]: 'Coordinador',
  [UserRole.PROFESOR]:    'Profesor',
  [UserRole.SECRETARIO]:  'Secretario',
  [UserRole.MODERADOR]:   'Moderador',
  [UserRole.ADMIN]:       'Administrador',
};

const EMPTY_FORM: CreateWorkflowTemplateDto = {
  name: '',
  description: '',
  categoryId: undefined,
  sectionIds: [],
  stateDefinitions: [{ state: '', role: '', order: 0 }],
  autoAssign: true,
  requiresComment: false,
  allowedInitiatorRoles: [],
  isActive: true,
};

interface WorkflowTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WorkflowTemplate | null;
  onSubmit: (data: CreateWorkflowTemplateDto) => void;
  isSubmitting: boolean;
  categories: Category[];
  sections: Section[];
}

export default function WorkflowTemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isSubmitting,
  categories,
  sections,
}: WorkflowTemplateDialogProps) {
  const [formData, setFormData] = useState<CreateWorkflowTemplateDto>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (template) {
        setFormData({
          name: template.name,
          description: template.description || '',
          categoryId: template.categoryId || undefined,
          sectionIds: template.sections?.map(s => s.id) ?? [],
          stateDefinitions: template.stateDefinitions.length > 0
            ? template.stateDefinitions
            : [{ state: '', role: '', order: 0 }],
          autoAssign: template.autoAssign,
          requiresComment: template.requiresComment,
          allowedInitiatorRoles: template.allowedInitiatorRoles ?? [],
          isActive: template.isActive,
        });
      } else {
        setFormData(EMPTY_FORM);
      }
    }
  }, [open, template]);

  const addStateDefinition = () => {
    setFormData((prev) => ({
      ...prev,
      stateDefinitions: [
        ...prev.stateDefinitions,
        { state: '', role: '', order: prev.stateDefinitions.length },
      ],
    }));
  };

  const removeStateDefinition = (index: number) => {
    if (formData.stateDefinitions.length <= 1) {
      toast.error('Debe haber al menos una etapa');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      stateDefinitions: prev.stateDefinitions
        .filter((_, i) => i !== index)
        .map((sd, i) => ({ ...sd, order: i })),
    }));
  };

  const updateStateDefinition = (index: number, field: keyof StateDefinition, value: any) => {
    setFormData((prev) => ({
      ...prev,
      stateDefinitions: prev.stateDefinitions.map((sd, i) =>
        i === index ? { ...sd, [field]: value } : sd
      ),
    }));
  };

  const moveStateDefinition = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.stateDefinitions.length) return;
    const newDefs = [...formData.stateDefinitions];
    [newDefs[index], newDefs[newIndex]] = [newDefs[newIndex], newDefs[index]];
    setFormData((prev) => ({
      ...prev,
      stateDefinitions: newDefs.map((sd, i) => ({ ...sd, order: i })),
    }));
  };

  const toggleInitiatorRole = (role: string) => {
    setFormData((prev) => {
      const current = prev.allowedInitiatorRoles ?? [];
      return {
        ...prev,
        allowedInitiatorRoles: current.includes(role)
          ? current.filter((r) => r !== role)
          : [...current, role],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }

    if (formData.stateDefinitions.length === 0) {
      toast.error('Debe agregar al menos una etapa');
      return;
    }

    for (const sd of formData.stateDefinitions) {
      if (!sd.state.trim() || !sd.role) {
        toast.error('Todas las etapas deben tener nombre y rol asignado');
        return;
      }
    }

    const payload: CreateWorkflowTemplateDto = {
      name: formData.name.trim(),
      stateDefinitions: formData.stateDefinitions,
      autoAssign: formData.autoAssign,
      requiresComment: formData.requiresComment,
      allowedInitiatorRoles: formData.allowedInitiatorRoles ?? [],
      isActive: formData.isActive,
    };

    if (formData.description?.trim()) payload.description = formData.description.trim();
    if (formData.categoryId) payload.categoryId = formData.categoryId;
    if (formData.sectionIds && formData.sectionIds.length > 0) payload.sectionIds = formData.sectionIds;

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Plantilla de Workflow' : 'Nueva Plantilla de Workflow'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Modifica los datos de la plantilla de workflow'
              : 'Define las etapas y roles para el flujo de aprobación'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info general */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Aprobación Académica"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el propósito de este workflow..."
                value={formData.description || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Alcance */}
            <div className="space-y-3">
              <div>
                <Label className="text-base">Alcance de la plantilla</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Elige <strong>una sola opción</strong>: contexto genérico (aplica a todas las categorías de ese tipo)
                  o categoría específica. Si no eliges ninguna, la plantilla estará disponible para cualquier documento.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Secciones que aplican</Label>
                <p className="text-xs text-muted-foreground">
                  Sin selección = disponible para cualquier documento. Si elige categoría específica, las secciones se ignoran.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {sections.map((sec) => (
                    <div key={sec.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <Checkbox
                        id={`section-${sec.id}`}
                        checked={(formData.sectionIds ?? []).includes(sec.id)}
                        onCheckedChange={() => {
                          setFormData((prev) => {
                            const current = prev.sectionIds ?? [];
                            return {
                              ...prev,
                              sectionIds: current.includes(sec.id)
                                ? current.filter((id) => id !== sec.id)
                                : [...current, sec.id],
                            };
                          });
                        }}
                      />
                      <label htmlFor={`section-${sec.id}`} className="text-sm cursor-pointer">
                        {sec.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoría específica</Label>
                <Select
                  value={formData.categoryId?.toString() || '__none__'}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: val === '__none__' ? undefined : Number(val),
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguna</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Roles que pueden iniciar */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Roles que pueden iniciar</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sin selección = cualquier rol iniciador puede usarla. ADMIN siempre tiene acceso.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INITIATOR_ROLE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Checkbox
                    id={`role-${opt.value}`}
                    checked={(formData.allowedInitiatorRoles ?? []).includes(opt.value)}
                    onCheckedChange={() => toggleInitiatorRole(opt.value)}
                  />
                  <label htmlFor={`role-${opt.value}`} className="text-sm cursor-pointer">
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Opciones</Label>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Asignación automática</p>
                <p className="text-xs text-muted-foreground">Asignar aprobadores automáticamente por rol</p>
              </div>
              <Switch
                checked={formData.autoAssign}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autoAssign: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Comentario obligatorio</p>
                <p className="text-xs text-muted-foreground">Requerir comentario en todas las acciones</p>
              </div>
              <Switch
                checked={formData.requiresComment}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, requiresComment: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activa</p>
                <p className="text-xs text-muted-foreground">Permite usar esta plantilla en nuevos workflows</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          {/* State Definitions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Etapas del Workflow *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStateDefinition}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Etapa
              </Button>
            </div>

            <div className="space-y-2">
              {formData.stateDefinitions.map((sd, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {index + 1}
                  </span>

                  <Input
                    placeholder="Nombre del estado"
                    value={sd.state}
                    onChange={(e) => updateStateDefinition(index, 'state', e.target.value)}
                    className="flex-1"
                  />

                  <Select
                    value={sd.role}
                    onValueChange={(val) => updateStateDefinition(index, 'role', val)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Rol aprobador" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPROVER_ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveStateDefinition(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveStateDefinition(index, 'down')}
                      disabled={index === formData.stateDefinitions.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeStateDefinition(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : template ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
