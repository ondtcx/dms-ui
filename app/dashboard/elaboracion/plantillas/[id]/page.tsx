'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  LayoutTemplate,
  Loader2,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { authoringService } from '@/lib/services/authoring.service';
import type { AuthoringTemplateVersion } from '@/lib/types/authoring';

const VERSION_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  RETIRED: 'Retirada',
};

const ACTIVITY_LABELS: Record<string, string> = {
  CREATED: 'Plantilla creada',
  UPDATED: 'Metadatos actualizados',
  VERSION_CREATED: 'Versión creada',
  VERSION_PUBLISHED: 'Versión publicada',
  VERSION_RETIRED: 'Versión retirada',
  DEACTIVATED: 'Plantilla desactivada',
  DUPLICATED: 'Plantilla duplicada',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function TemplateAdminContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canDesign = hasPermission('authoring.templates.design');
  const canPublish = hasPermission('authoring.templates.publish');
  const canManage = hasPermission('authoring.templates.manage');
  const templateId = Number(params.id);
  const [busyVersion, setBusyVersion] = useState<number | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [activityActor, setActivityActor] = useState('ALL');
  const [activityFrom, setActivityFrom] = useState('');
  const [activityTo, setActivityTo] = useState('');
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const query = useQuery({
    queryKey: ['authoring-template', templateId],
    queryFn: () => authoringService.getTemplate(templateId),
    enabled: Number.isSafeInteger(templateId) && templateId > 0,
  });
  const activityQuery = useQuery({
    queryKey: ['authoring-template-activity', templateId],
    queryFn: () => authoringService.listTemplateActivity(templateId),
    enabled: Number.isSafeInteger(templateId) && templateId > 0,
  });
  const template = query.data;
  const versions = template?.versions ?? [];
  const latest = versions[0];
  const published = versions.find((version) => version.status === 'PUBLISHED');

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['authoring-template', templateId] });
    await queryClient.invalidateQueries({ queryKey: ['authoring-templates'] });
    await queryClient.invalidateQueries({
      queryKey: ['authoring-template-activity', templateId],
    });
  };

  const activityActors = useMemo(() => {
    const values = new Set<string>();
    for (const activity of activityQuery.data ?? []) {
      values.add(activity.actorName || activity.actorId);
    }
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [activityQuery.data]);

  const activityRows = useMemo(() => {
    const rows = activityQuery.data ?? [];
    return rows.filter((activity) => {
      if (activityFilter !== 'ALL' && activity.action !== activityFilter) {
        return false;
      }
      const actor = activity.actorName || activity.actorId;
      if (activityActor !== 'ALL' && actor !== activityActor) {
        return false;
      }
      const date = activity.createdAt.slice(0, 10);
      if (activityFrom && date < activityFrom) return false;
      if (activityTo && date > activityTo) return false;
      return true;
    });
  }, [activityActor, activityFilter, activityFrom, activityQuery.data, activityTo]);

  const exportActivity = () => {
    if (!template) return;
    const rows = [
      ['Fecha', 'Acción', 'Versión', 'Actor', 'Detalle'],
      ...activityRows.map((activity) => [
        new Date(activity.createdAt).toLocaleString('es-ES'),
        ACTIVITY_LABELS[activity.action] ?? activity.action,
        activity.version?.version ? `v${activity.version.version}` : '',
        activity.actorName || activity.actorId,
        activity.action === 'DUPLICATED'
          ? `→ ${activity.metadata?.newTemplateName ?? ''}`
          : activity.metadata?.duplicatedFromId
            ? `desde plantilla ${activity.metadata.duplicatedFromId}`
            : '',
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `actividad-${template.name.replace(/\s+/g, '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const publish = async (version: AuthoringTemplateVersion) => {
    if (!template) return;
    setBusyVersion(version.id);
    try {
      await authoringService.publishVersion(template.id, version.id);
      await refresh();
      toast.success(`Versión ${version.version} publicada`);
    } catch {
      toast.error('No se pudo publicar la versión');
    } finally {
      setBusyVersion(null);
    }
  };

  const deactivate = async () => {
    if (!template) return;
    setDeactivating(true);
    try {
      await authoringService.deactivateTemplate(template.id);
      await refresh();
      toast.success('Plantilla desactivada');
    } catch {
      toast.error('No se pudo desactivar la plantilla');
    } finally {
      setDeactivating(false);
    }
  };

  const preview = async (version?: AuthoringTemplateVersion) => {
    if (!template) return;
    try {
      const blob = await authoringService.previewTemplate(template.id, version?.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo generar la vista previa');
    }
  };

  const openDuplicate = () => {
    setDuplicateName(
      template ? `${template.name} (copia)` : 'Nueva plantilla desde diseño',
    );
    setDuplicateOpen(true);
  };

  const duplicate = async () => {
    if (!template || !latest || !duplicateName.trim()) return;
    setDuplicating(true);
    try {
      const created = await authoringService.createTemplate({
        name: duplicateName.trim(),
        description: `${template.description || 'Plantilla institucional'} (copia)`,
        bodyHtml: latest.bodyHtml,
        styles: latest.styles ?? undefined,
        headerHtml: latest.headerHtml ?? undefined,
        footerHtml: latest.footerHtml ?? undefined,
        marginTop: latest.marginTop ?? undefined,
        marginBottom: latest.marginBottom ?? undefined,
        marginLeft: latest.marginLeft ?? undefined,
        marginRight: latest.marginRight ?? undefined,
        pageFrame: latest.pageFrame ?? undefined,
        signatures: latest.signatures ?? undefined,
        fields: latest.fields,
        pageSize: latest.pageSize ?? undefined,
        orientation: latest.orientation ?? undefined,
        numberPrefix: latest.numberPrefix,
        duplicatedFromId: template.id,
      });
      setDuplicateOpen(false);
      toast.success('Plantilla duplicada. Revisa y publica la versión.');
      router.push(`/dashboard/elaboracion/plantillas/${created.id}`);
    } catch {
      toast.error('No se pudo duplicar la plantilla');
    } finally {
      setDuplicating(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando plantilla...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Plantilla no encontrada.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/elaboracion')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 h-auto px-0 py-0 text-muted-foreground"
            onClick={() => router.push('/dashboard/elaboracion')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Biblioteca
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.description || 'Plantilla institucional'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={template.isActive ? 'default' : 'outline'}>
              {template.isActive ? 'Activa' : 'Inactiva'}
            </Badge>
            {latest && <span className="text-muted-foreground">Última versión: {latest.version}</span>}
            {published && (
              <span className="text-muted-foreground">
                Publicada: versión {published.version}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDesign && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/elaboracion/plantillas/${template.id}/diseno`}>
                <LayoutTemplate className="mr-2 h-4 w-4" /> Editar diseño
              </Link>
            </Button>
          )}
          {canDesign && (
            <Button asChild>
              <Link href={`/dashboard/elaboracion/plantillas/${template.id}/versiones/nueva`}>
                <FilePlus2 className="mr-2 h-4 w-4" /> Nueva versión
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => preview(published ?? latest)}>
            <Eye className="mr-2 h-4 w-4" /> Previsualizar
          </Button>
          {canManage && (
            <Button variant="outline" onClick={openDuplicate}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar
            </Button>
          )}
          {canManage && template.isActive && (
            <Button variant="outline" onClick={deactivate} disabled={deactivating}>
              {deactivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <EyeOff className="mr-2 h-4 w-4" />
              )}
              Desactivar
            </Button>
          )}
          {published && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/elaboracion/${template.id}/nuevo`}>
                <Send className="mr-2 h-4 w-4" /> Usar plantilla
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar plantilla</DialogTitle>
            <DialogDescription>
              Se creará una nueva plantilla con el mismo cuerpo, campos y diseño
              de página. La nueva plantilla empieza como borrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="duplicate-name">
              Nombre de la nueva plantilla
            </label>
            <Input
              id="duplicate-name"
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={duplicate} disabled={duplicating || !duplicateName.trim()}>
              {duplicating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Versiones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Versión</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Prefijo</th>
                  <th className="px-3 py-2 font-medium">Publicada</th>
                  <th className="px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium">v{version.version}</td>
                    <td className="px-3 py-3">
                      <Badge variant={version.status === 'PUBLISHED' ? 'default' : 'outline'}>
                        {VERSION_LABELS[version.status] ?? version.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{version.numberPrefix}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <div>{formatDate(version.publishedAt)}</div>
                      {version.publishedByName && (
                        <div className="text-xs">por {version.publishedByName}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => preview(version)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                        </Button>
                        {version.status === 'DRAFT' && canPublish && (
                          <Button
                            size="sm"
                            onClick={() => publish(version)}
                            disabled={busyVersion === version.id}
                          >
                            {busyVersion === version.id ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="mr-1 h-3.5 w-3.5" />
                            )}
                            Publicar
                          </Button>
                        )}
                        {version.status === 'PUBLISHED' && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/elaboracion/${template.id}/nuevo`}>
                              Usar
                            </Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Actividad de la plantilla</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
              aria-label="Filtrar actividad"
            >
              <option value="ALL">Toda la actividad</option>
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              className="h-8 max-w-40 rounded-md border border-input bg-background px-2 text-xs"
              value={activityActor}
              onChange={(event) => setActivityActor(event.target.value)}
              aria-label="Filtrar por actor"
            >
              <option value="ALL">Todos los actores</option>
              {activityActors.map((actor) => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
            <input
              type="date"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={activityFrom}
              onChange={(event) => setActivityFrom(event.target.value)}
              aria-label="Desde"
            />
            <input
              type="date"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={activityTo}
              onChange={(event) => setActivityTo(event.target.value)}
              aria-label="Hasta"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportActivity}
              disabled={!activityRows.length}
            >
              <Download className="mr-1 h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando actividad...
            </div>
          ) : activityRows.length ? (
            <div className="space-y-2">
              {activityRows.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col gap-1 rounded-md border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {ACTIVITY_LABELS[activity.action] ?? activity.action}
                    </Badge>
                    {activity.version?.version && (
                      <span className="text-muted-foreground">
                        v{activity.version.version}
                      </span>
                    )}
                    {activity.action === 'DUPLICATED' &&
                      activity.metadata?.newTemplateName && (
                        <span className="text-muted-foreground">
                          → {activity.metadata.newTemplateName}
                        </span>
                      )}
                    {activity.action === 'CREATED' &&
                      activity.metadata?.duplicatedFromId && (
                        <span className="text-muted-foreground">
                          desde plantilla {activity.metadata.duplicatedFromId}
                        </span>
                      )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.actorName || activity.actorId} ·{' '}
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay actividad registrada.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TemplateAdminPage() {
  return (
    <ProtectedRoute>
      <TemplateAdminContent />
    </ProtectedRoute>
  );
}
