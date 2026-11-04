'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Eye, FileText, Loader2, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { authoringService } from '@/lib/services/authoring.service';
import type { AuthoringDocument, AuthoringTemplate } from '@/lib/types/authoring';
import { AuthoringStatusBadge } from '@/components/authoring/AuthoringStatusBadge';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function TemplateCard({
  template,
  onPreview,
  onUse,
}: {
  template: AuthoringTemplate;
  onPreview: (template: AuthoringTemplate) => void;
  onUse: (template: AuthoringTemplate) => void;
}) {
  const published = template.versions.find((version) => version.status === 'PUBLISHED');
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription className="mt-1">
              {template.description || 'Plantilla institucional'}
            </CardDescription>
          </div>
          {published && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              v{published.version}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap gap-2 pt-0">
        <Button size="sm" onClick={() => onUse(template)}>
          <FileText className="mr-1.5 h-4 w-4" />
          Usar plantilla
        </Button>
        <Button size="sm" variant="outline" onClick={() => onPreview(template)}>
          <Eye className="mr-1.5 h-4 w-4" />
          Previsualizar
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/dashboard/elaboracion/plantillas/${template.id}`}>
            <Settings2 className="mr-1.5 h-4 w-4" />
            Administrar
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DocumentRow({ document }: { document: AuthoringDocument }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-3">
        <Link
          href={`/dashboard/elaboracion/${document.id}`}
          className="font-medium hover:underline"
        >
          {document.name || document.description || `Documento #${document.id}`}
        </Link>
        <div className="text-xs text-muted-foreground">
          {document.templateData?.template?.name ?? 'Sin plantilla'}
        </div>
      </td>
      <td className="px-3 py-3">
        <AuthoringStatusBadge status={document.authoring.status} />
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground">
        {document.documentNumber || '—'}
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground">
        {formatDate(document.updatedAt)}
      </td>
      <td className="px-3 py-3 text-right">
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/elaboracion/${document.id}`}>Abrir</Link>
        </Button>
      </td>
    </tr>
  );
}

function ElaboracionPageContent() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canManageTemplates = hasPermission('authoring.templates.manage');
  const [search, setSearch] = useState('');
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ['authoring-templates'],
    queryFn: () => authoringService.listTemplates(),
  });
  const documentsQuery = useQuery({
    queryKey: ['authoring-documents', search],
    queryFn: () =>
      authoringService.listDocuments({
        search: search || undefined,
        limit: 50,
      }),
  });

  const previewTemplate = async (template: AuthoringTemplate) => {
    const blob = await authoringService.previewTemplate(template.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const useTemplate = (template: AuthoringTemplate) => {
    router.push(`/dashboard/elaboracion/${template.id}/nuevo`);
  };

  const cleanupAssets = async () => {
    setCleaning(true);
    try {
      const result = await authoringService.cleanupAssets();
      toast.success(
        `Limpieza completada: ${result.deleted} imágenes eliminadas y ${result.kept} conservadas.`,
      );
      setCleanupOpen(false);
      await templatesQuery.refetch();
    } catch {
      toast.error('No se pudo limpiar las imágenes');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Elaboración documental</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plantillas institucionales, borradores y documentos emitidos.
          </p>
        </div>
        {canManageTemplates && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setCleanupOpen(true)}
              disabled={cleaning}
            >
              {cleaning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Limpiar imágenes
            </Button>
            <Button asChild>
              <Link href="/dashboard/elaboracion/plantillas/nueva">
                <Plus className="mr-2 h-4 w-4" />
                Nueva plantilla
              </Link>
            </Button>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Biblioteca de plantillas</h2>
        </div>
        {templatesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando plantillas...
          </div>
        ) : templatesQuery.isError ? (
          <p className="text-sm text-destructive">No se pudieron cargar las plantillas.</p>
        ) : templatesQuery.data?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templatesQuery.data.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={previewTemplate}
                onUse={useTemplate}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No hay plantillas publicadas. Crea la primera para empezar.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Documentos de elaboración</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar borradores o emitidos..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Documento</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Número</th>
                  <th className="px-3 py-2 font-medium">Actualizado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {documentsQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                      Cargando documentos...
                    </td>
                  </tr>
                ) : documentsQuery.data?.data?.length ? (
                  documentsQuery.data.data.map((document) => (
                    <DocumentRow key={document.id} document={document} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      Todavía no hay documentos de elaboración.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <ConfirmDialog
        open={cleanupOpen}
        onOpenChange={setCleanupOpen}
        title="Limpiar imágenes no usadas"
        description="Se eliminarán las imágenes subidas que no estén referenciadas por ninguna plantilla, documento o versión, y que tengan más de 24 horas. Esta acción no se puede deshacer."
        confirmLabel="Limpiar"
        variant="destructive"
        loading={cleaning}
        onConfirm={cleanupAssets}
      />
    </div>
  );
}

export default function ElaboracionPage() {
  return (
    <ProtectedRoute>
      <ElaboracionPageContent />
    </ProtectedRoute>
  );
}
