'use client';

import { useState } from 'react';
import { sharesService } from '@/lib/services/shares.service';
import { CreateShareDto, UserRole } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import { Share2, Link2, Users, Building2, GraduationCap, Calendar, Eye, Lock } from 'lucide-react';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
  documentName: string;
  onSuccess?: () => void;
}

export function ShareModal({
  open,
  onOpenChange,
  documentId,
  documentName,
  onSuccess,
}: ShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [shareType, setShareType] = useState<'user' | 'role' | 'department' | 'course' | 'public'>('public');
  const [formData, setFormData] = useState<CreateShareDto>({
    documentId,
    canView: true,
    canDownload: true,
    canEdit: false,
    canShare: false,
    isPublicLink: true,
    requiresPassword: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const shareData: CreateShareDto = {
        ...formData,
        documentId,
      };

      const share = await sharesService.create(shareData);

      if (share.isPublicLink) {
        await sharesService.copyShareLink(share.shareToken);
        toast.success('Link de compartir copiado al portapapeles');
      } else {
        toast.success('Documento compartido exitosamente');
      }

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error sharing document:', error);
      toast.error(error.response?.data?.message || 'Error al compartir el documento');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      documentId,
      canView: true,
      canDownload: true,
      canEdit: false,
      canShare: false,
      isPublicLink: true,
      requiresPassword: false,
    });
    setShareType('public');
  };

  const handleShareTypeChange = (type: typeof shareType) => {
    setShareType(type);
    setFormData((prev) => ({
      ...prev,
      userId: undefined,
      role: undefined,
      departmentId: undefined,
      courseId: undefined,
      isPublicLink: type === 'public',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartir documento
          </DialogTitle>
          <DialogDescription>
            Compartir "{documentName}" con otros usuarios o generar un link público
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={shareType} onValueChange={(v) => handleShareTypeChange(v as typeof shareType)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="public" className="gap-1">
                <Link2 className="h-4 w-4" />
                Link
              </TabsTrigger>
              <TabsTrigger value="user" className="gap-1">
                <Users className="h-4 w-4" />
                Usuario
              </TabsTrigger>
              <TabsTrigger value="role" className="gap-1">
                <Users className="h-4 w-4" />
                Rol
              </TabsTrigger>
              <TabsTrigger value="department" className="gap-1">
                <Building2 className="h-4 w-4" />
                Depto
              </TabsTrigger>
              <TabsTrigger value="course" className="gap-1">
                <GraduationCap className="h-4 w-4" />
                Curso
              </TabsTrigger>
            </TabsList>

            <TabsContent value="public" className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Se generará un link único que cualquier persona con el link puede acceder
                </p>
              </div>
            </TabsContent>

            <TabsContent value="user" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">ID del Usuario</Label>
                <Input
                  id="userId"
                  placeholder="Ingrese el ID del usuario"
                  value={formData.userId || ''}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="role" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.DIRECTOR}>Director</SelectItem>
                    <SelectItem value={UserRole.COORDINADOR}>Coordinador</SelectItem>
                    <SelectItem value={UserRole.PROFESOR}>Profesor</SelectItem>
                    <SelectItem value={UserRole.SECRETARIO}>Secretario</SelectItem>
                    <SelectItem value={UserRole.ESTUDIANTE}>Estudiante</SelectItem>
                    <SelectItem value={UserRole.PADRE}>Padre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="department" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="departmentId">ID del Departamento</Label>
                <Input
                  id="departmentId"
                  type="number"
                  placeholder="Ingrese el ID del departamento"
                  value={formData.departmentId || ''}
                  onChange={(e) => setFormData({ ...formData, departmentId: parseInt(e.target.value) })}
                />
              </div>
            </TabsContent>

            <TabsContent value="course" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="courseId">ID del Curso</Label>
                <Input
                  id="courseId"
                  type="number"
                  placeholder="Ingrese el ID del curso"
                  value={formData.courseId || ''}
                  onChange={(e) => setFormData({ ...formData, courseId: parseInt(e.target.value) })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Permisos</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Puede ver</Label>
                  <p className="text-xs text-muted-foreground">Permite ver el documento</p>
                </div>
                <Switch
                  checked={formData.canView}
                  onCheckedChange={(checked) => setFormData({ ...formData, canView: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Puede descargar</Label>
                  <p className="text-xs text-muted-foreground">Permite descargar el documento</p>
                </div>
                <Switch
                  checked={formData.canDownload}
                  onCheckedChange={(checked) => setFormData({ ...formData, canDownload: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Puede editar</Label>
                  <p className="text-xs text-muted-foreground">Permite editar el documento</p>
                </div>
                <Switch
                  checked={formData.canEdit}
                  onCheckedChange={(checked) => setFormData({ ...formData, canEdit: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Puede re-compartir</Label>
                  <p className="text-xs text-muted-foreground">Permite compartir con otros</p>
                </div>
                <Switch
                  checked={formData.canShare}
                  onCheckedChange={(checked) => setFormData({ ...formData, canShare: checked })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Opciones avanzadas</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Requiere contraseña
                </Label>
                <p className="text-xs text-muted-foreground">Proteger con contraseña</p>
              </div>
              <Switch
                checked={formData.requiresPassword}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresPassword: checked })
                }
              />
            </div>

            {formData.requiresPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese una contraseña"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de expiración
              </Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt || ''}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxViews" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Límite de vistas
              </Label>
              <Input
                id="maxViews"
                type="number"
                min="1"
                placeholder="Sin límite"
                value={formData.maxViews || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxViews: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Compartiendo...' : 'Compartir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
