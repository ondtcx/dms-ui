'use client';

import { formatMimeType, formatRole } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/lib/services/documents.service';
import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  FileText,
  Download,
  Trash2,
  ArrowLeft,
  Eye,
  Calendar,
  CalendarDays,
  User,
  FileType,
  Clock,
  Pencil,
  History,
  FileUp,
  MoreVertical,
  Hash,
  ShieldAlert,
  ScrollText,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EditDocumentDialog } from '@/components/documents/EditDocumentDialog';
import { DocumentVersionHistory } from '@/components/documents/DocumentVersionHistory';
import { ReplaceFileDialog } from '@/components/documents/ReplaceFileDialog';
import { ExplainPermissionsDialog } from '@/components/documents/ExplainPermissionsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UserRole, type Document } from '@/lib/types';
import { readDocumentActionCapabilities } from '@/lib/document-action-capabilities';
import { getDocumentTraceability } from '@/lib/document-traceability';
import { validOriginDate } from '@/lib/upload-date';
import OfficeDocumentPreview, { isOfficePreviewType } from '@/components/documents/OfficeDocumentPreview';
import { DocumentSharingAction } from '@/components/documents/DocumentSharingAction';
import { SharingIndicator } from '@/components/documents/SharingIndicator';
import { ChangeRequestPanel } from '@/components/documents/ChangeRequestPanel';
import { RequestChangesDialog } from '@/components/documents/RequestChangesDialog';

const AUDIT_HISTORY_ROLES: ReadonlySet<string> = new Set([UserRole.ADMIN, UserRole.RECTOR]);

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const documentId = parseInt(params.id as string);
  const identity = `${user?.id ?? ''}:${documentId}`;
  const current = useRef({ identity, epoch: {}, alive: true });
  if (current.current.identity !== identity) current.current = { identity, epoch: {}, alive: true };
  const epoch = current.current.epoch;
  const previewEpoch = useRef<object | null>(null);
  const deleteEpoch = useRef<object | null>(null);
  useEffect(() => {
    current.current.alive = true;
    return () => { current.current.alive = false; };
  }, []);

  // Estados
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExplainDialog, setShowExplainDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  useEffect(() => {
    setShowEditDialog(false); setShowReplaceDialog(false); setShowDeleteConfirm(false);
    setShowVersionHistory(false); setShowExplainDialog(false);
    setShowRequestDialog(false);
    setPreviewUrl(''); setLoadingPreview(false);
  }, [identity]);

  // Cargar documento
  const queryKey = ['document', documentId, user?.id];
  const query = useQuery({
    queryKey,
    queryFn: () => documentsService.getOne(documentId),
    enabled: !!user?.id && Number.isSafeInteger(documentId) && documentId > 0,
    placeholderData: () => undefined,
  });
  const { isLoading, isFetching } = query;
  const doc = query.isSuccess && query.data?.id === documentId ? query.data : undefined;
  const canAct = (action: 'editMetadata' | 'editContent' | 'trash', boundEpoch: object = epoch) => {
    const state = queryClient.getQueryState(queryKey);
    const snapshot = queryClient.getQueryData<Document>(queryKey);
    return !!user?.id && current.current.alive && current.current.epoch === boundEpoch &&
      state?.status === 'success' && state.fetchStatus === 'idle' && !state.isInvalidated &&
      snapshot?.id === documentId && readDocumentActionCapabilities(snapshot, user?.id ?? null)?.[action] === true;
  };

  // Mutación para eliminar
  const deleteMutation = useMutation({
    mutationFn: ({ id, epoch: boundEpoch }: { id: number; epoch: object }) => {
      if (id !== documentId || !canAct('trash', boundEpoch)) throw new Error('Los permisos han cambiado.');
      return documentsService.delete(id);
    },
    onSuccess: (_data, { epoch: boundEpoch }) => {
      if (!canAct('trash', boundEpoch)) return;
      toast.success('Documento eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.push('/dashboard/documents');
    },
    onError: (_error, { epoch: boundEpoch }) => {
      if (current.current.epoch !== boundEpoch || !current.current.alive) return;
      toast.error('Error al eliminar documento');
    },
  });

  const canEditTemplate =
    !!user &&
    !!doc &&
    (user.role === UserRole.ADMIN ||
      user.role === UserRole.RECTOR ||
      doc.uploadedById === user.id);

  const canExplainPermissions =
    !!user &&
    (user.role === UserRole.ADMIN ||
      user.role === UserRole.RECTOR ||
      user.role === UserRole.COORDINADOR);

  // La propiedad y los roles efectivos autorizan la consulta de actividad.
  const canViewAuditHistory =
    !!user && !!doc && !isFetching &&
    (doc.uploadedById === user.id ||
      [user.role, ...(user.roles ?? [])].some((role) => AUDIT_HISTORY_ROLES.has(role)));

  const isPreviewable = (mimetype: string): boolean => {
    if (mimetype === 'application/pdf') return true;
    if (mimetype.startsWith('image/')) return true;
    if (mimetype.startsWith('text/')) return true;
    if (mimetype.startsWith('video/')) return true;
    if (mimetype.startsWith('audio/')) return true;
    return false;
  };

  // Cargar vista previa
  useEffect(() => {
    let cancelled = false;
    if (!doc || !isPreviewable(doc.versions?.[0]?.mimetype ?? '')) return;
    const active = () => !cancelled && current.current.alive && current.current.epoch === epoch;
    setLoadingPreview(true);
    void (async () => {
      try {
        const blob = await documentsService.view(doc.id);
        const url = window.URL.createObjectURL(new Blob([blob], { type: doc.versions?.[0]?.mimetype ?? '' }));
        if (active()) { previewEpoch.current = epoch; setPreviewUrl(url); }
        else window.URL.revokeObjectURL(url);
      } catch {
        if (active()) toast.error('Error al cargar la vista previa');
      } finally { if (active()) setLoadingPreview(false); }
    })();
    return () => { cancelled = true; };
  }, [doc, epoch]);

  // Limpiar URL del blob al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDownload = async () => {
    if (!doc) return;

    try {
      const blob = await documentsService.download(doc.id);
      if (current.current.epoch !== epoch || !current.current.alive) return;
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = ((doc?.versions?.[0]?.filename) ?? '');
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      toast.success('Descarga iniciada');
    } catch {
      if (current.current.epoch === epoch && current.current.alive) toast.error('Error al descargar archivo');
    }
  };

  const handleDelete = () => {
    if (!doc || !canAct('trash')) return;
    deleteEpoch.current = epoch;
    setShowDeleteConfirm(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Documento no encontrado</h1>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  const originDate = doc.originDate && validOriginDate(doc.originDate)
    ? parseISO(doc.originDate)
    : null;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-mono text-sm text-muted-foreground mb-0.5">{getDocumentTraceability(doc).number}</p>
                <h1 className="text-3xl font-bold">{doc.name?.trim() || doc.versions?.[0]?.filename || ''}</h1>
                {!isFetching && <SharingIndicator summary={doc.sharingSummary} provenance={doc.sharingProvenance} reception={readDocumentActionCapabilities(doc)?.scope === 'reception'} />}
                <p className="text-sm text-muted-foreground">Archivo original: <span>{doc.versions?.[0]?.filename ?? ''}</span></p>
                  </div>
           <p className="text-muted-foreground mt-1">
             {doc.description || 'Sin descripción'}
           </p>
          </div>
        </div>
      </div>

        <div className="flex items-center gap-2">
          {!isFetching && <DocumentSharingAction key={identity} document={doc} />}
          {canAct('editContent') && (
            <Button onClick={() => canAct('editContent') && setShowReplaceDialog(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          )}
          {doc.templateId && canEditTemplate && (
            <Button
              onClick={() => {
                if (!canEditTemplate) return;
                router.push(`/dashboard/documents/${doc.id}/edit-form`);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isFetching && doc.canRequestChanges === true && (
                <DropdownMenuItem onClick={() => setShowRequestDialog(true)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Solicitar cambios
                </DropdownMenuItem>
              )}
              {canExplainPermissions && (
                <>
                  <DropdownMenuItem onClick={() => setShowExplainDialog(true)}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Auditar Accesos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canViewAuditHistory && (
                <DropdownMenuItem onClick={() => router.push(`/dashboard/documents/${doc.id}/audit`)}>
                  <ScrollText className="mr-2 h-4 w-4" />
                  Registro de actividad
                </DropdownMenuItem>
              )}
              {canAct('editMetadata') && (
                  <DropdownMenuItem onClick={() => canAct('editMetadata') && setShowEditDialog(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar información
                  </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
                <History className="mr-2 h-4 w-4" />
                Historial de versiones
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canAct('trash') && (<DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vista previa principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isOfficePreviewType(doc.versions?.[0]?.mimetype ?? '') ? (
                <OfficeDocumentPreview documentId={doc.id} versionKey={String(doc.versions?.[0]?.id ?? doc.currentVersion)} mimetype={doc.versions?.[0]?.mimetype ?? ''} onDownload={handleDownload} />
              ) : loadingPreview ? (
                <div className="flex flex-col items-center justify-center h-[600px]">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground mt-4">Cargando vista previa...</p>
                </div>
              ) : previewUrl && previewEpoch.current === epoch ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px] border rounded-md"
                  title={doc.name?.trim() || doc.versions?.[0]?.filename || ''}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4" />
                  <p>Vista previa no disponible para este tipo de archivo</p>
                  <p className="text-sm mt-1">{formatMimeType(((doc?.versions?.[0]?.mimetype) ?? ''))}</p>
                  <Button variant="outline" className="mt-4" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar para ver
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral de información */}
         <div className="space-y-6">
           <ChangeRequestPanel key={identity} documentId={doc.id} />
           {/* Información del documento */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Número de documento</p>
                     <p className="text-sm font-mono text-foreground">{getDocumentTraceability(doc).number}</p>
                   </div>
                 </div>

                   <Separator />

                 <div className="flex items-start gap-3">
                   <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                   <div className="flex-1">
                     <p className="text-sm font-medium">Tipo de documento</p>
                     <p className="text-sm text-muted-foreground">
                       {doc.documentType?.name ?? doc.template?.documentType?.name ?? 'Sin tipo de documento'}
                     </p>
                   </div>
                 </div>

                 <Separator />

                 <div className="flex items-start gap-3">
                   <FileType className="h-5 w-5 text-muted-foreground mt-0.5" />
                   <div className="flex-1">
                     <p className="text-sm font-medium">Tipo de archivo</p>
                     <p className="text-sm text-muted-foreground">{formatMimeType(((doc?.versions?.[0]?.mimetype) ?? ''))}</p>
                   </div>
                 </div>

                 <Separator />

                 <div className="flex items-start gap-3">
                   <History className="h-5 w-5 text-muted-foreground mt-0.5" />
                   <div className="flex-1">
                     <p className="text-sm font-medium">Versión actual</p>
                      <p className="text-sm text-muted-foreground">{getDocumentTraceability(doc).version}</p>
                    </div>
                  </div>

                 <Separator />

                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tamaño</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(((doc?.versions?.[0]?.size) ?? 0))}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Subido por</p>
                    <p className="text-sm text-muted-foreground">{doc.uploadedBy.name}</p>
                    {doc.uploadedBy.role && (
                      <p className="text-xs text-muted-foreground/70">
                        {formatRole(doc.uploadedBy.role)}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {originDate && (
                  <>
                    <div className="flex items-start gap-3">
                      <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Fecha de origen</p>
                        <p className="text-sm text-muted-foreground">
                          {format(originDate, 'PPP', { locale: es })}
                        </p>
                      </div>
                    </div>

                    <Separator />
                  </>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Fecha de creación</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(doc.createdAt), 'PPP', { locale: es })}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Última modificación</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(doc.updatedAt), 'PPP', { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plantilla */}
          {doc.template && (
            <Card>
              <CardHeader>
                <CardTitle>Plantilla</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Plantilla original</p>
                    <Badge variant="outline">{doc.template.name}</Badge>
                  </div>
                  {doc.templateData && doc.templateData.formData && Object.keys(doc.templateData.formData).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 mt-4">Datos extraídos</p>
                      <div className="space-y-2 text-sm text-muted-foreground border rounded-md p-3 bg-muted/50">
                        {Object.entries(doc.templateData.formData).slice(0, 5).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-4">
                            <span className="font-medium truncate">{key}:</span>
                            <span className="truncate">{String(value)}</span>
                          </div>
                        ))}
                        {Object.keys(doc.templateData.formData).length > 5 && (
                          <p className="text-xs text-center mt-2 pt-2 border-t">
                            + {Object.keys(doc.templateData.formData).length - 5} campos más
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modales */}
      {showRequestDialog && <RequestChangesDialog key={identity} documentId={doc.id} open onOpenChange={setShowRequestDialog} />}
      {showEditDialog && (
        <EditDocumentDialog
          key={identity}
          authorize={() => canAct('editMetadata')}
          document={doc}
          open={showEditDialog && (isFetching || canAct('editMetadata'))}
          onOpenChange={setShowEditDialog}
        />
      )}

      {showVersionHistory && (
        <DocumentVersionHistory
          key={identity}
          documentId={doc.id}
          currentVersion={doc.currentVersion || 1}
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
        />
      )}

      {showReplaceDialog && (
        <ReplaceFileDialog
          key={identity}
          authorize={() => canAct('editContent')}
          documentId={doc.id}
          documentName={((doc?.versions?.[0]?.filename) ?? '')}
          open={showReplaceDialog && (isFetching || canAct('editContent'))}
          onOpenChange={setShowReplaceDialog}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm && !!deleteEpoch.current && canAct('trash', deleteEpoch.current)}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar documento"
        description={`¿Estás seguro de eliminar "${((doc?.versions?.[0]?.filename) ?? '')}"? El documento será enviado a la papelera.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteEpoch.current && canAct('trash', deleteEpoch.current))
            deleteMutation.mutate({ id: doc.id, epoch: deleteEpoch.current });
          setShowDeleteConfirm(false);
        }}
      />

      <ExplainPermissionsDialog
        documentId={doc.id}
        open={showExplainDialog}
        onOpenChange={setShowExplainDialog}
      />
    </div>
  );
}
