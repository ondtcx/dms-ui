'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Eye, FileText, Loader2, Plus, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react';
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
  canManage,
  onPreview,
  onUse,
}: {
  template: AuthoringTemplate;
  canManage: boolean;
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
        {canManage && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/dashboard/elaboracion/plantillas/${template.id}`}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              Administrar
            </Link>
          </Button>
        )}
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
      <td className="px-3 py-3 font-mono text-sm text-muted-foreground">
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
  const [page, setPage] = useState(1);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ['authoring-templates'],
    queryFn: () => authoringService.listTemplates(),
  });
  const documentsPageSize = 20;
  const documentsQuery = useQuery({
    queryKey: ['authoring-documents', search, page],
    queryFn: () =>
      authoringService.listDocuments({
        search: search || undefined,
        page,
        limit: documentsPageSize,
      }),
  });
  useEffect(() => {
    setPage(1);
  }, [search]);
  const documentsTotal = documentsQuery.data?.total ?? 0;
  const documentsCurrentPage = documentsQuery.data?.page ?? page;
  const documentsTotalPages = Math.max(
    Math.ceil(documentsTotal / documentsPageSize),
    1,
  );
  const documentsRangeStart =
    documentsTotal === 0
      ? 0
      : (documentsCurrentPage - 1) * documentsPageSize + 1;
  const documentsRangeEnd = Math.min(
    documentsCurrentPage * documentsPageSize,
    documentsTotal,
  );

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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Configuración
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Plantillas institucionales
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Biblioteca de plantillas versionadas para crear documentos.
          </p>
        </div>
        {canManageTemplates && (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/elaboracion/plantillas/nueva">
                <Plus className="mr-2 h-4 w-4" />
                Nueva plantilla
              </Link>
            </Button>
            <Button
              variant="ghost"
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
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-destructive">
              No se pudieron cargar las plantillas.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => templatesQuery.refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : templatesQuery.data?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templatesQuery.data.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                canManage={canManageTemplates}
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
              aria-label="Buscar borradores o emitidos"
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
                ) : documentsQuery.isError ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center">
                      <p className="text-sm text-destructive">
                        No se pudieron cargar los documentos de elaboración.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => documentsQuery.refetch()}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reintentar
                      </Button>
                    </td>
                  </tr>
                ) : documentsQuery.data?.data?.length ? (
                  documentsQuery.data.data.map((document) => (
                    <DocumentRow key={document.id} document={document} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      {search
                        ? "No se encontraron documentos con esa búsqueda."
                        : "Todavía no hay documentos de elaboración."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {documentsTotal > 0 && (
            <div className="flex flex-col gap-2 border-t border-border px-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Mostrando {documentsRangeStart}–{documentsRangeEnd} de{" "}
                {documentsTotal} documentos
              </p>
              {documentsTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={
                      documentsCurrentPage <= 1 || documentsQuery.isFetching
                    }
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {documentsCurrentPage} de {documentsTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(documentsTotalPages, current + 1),
                      )
                    }
                    disabled={
                      documentsCurrentPage >= documentsTotalPages ||
                      documentsQuery.isFetching
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          )}
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
