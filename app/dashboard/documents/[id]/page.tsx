'use client';

import { formatMimeType, formatRole } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/lib/services/documents.service';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  FileText,
  Download,
  Trash2,
  ArrowLeft,
  Eye,
  Calendar,
  User,
  FileType,
  Clock,
  Pencil,
  History,
  FileUp,
  MoreVertical,
  Hash,
  Layers,
  ShieldAlert,
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
import DocumentWorkflowCard from '@/components/workflows/DocumentWorkflowCard';
import { DocumentCompositionCard } from '@/components/documents/DocumentCompositionCard';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UserRole } from '@/lib/types';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const documentId = parseInt(params.id as string);

  // Estados
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExplainDialog, setShowExplainDialog] = useState(false);

  // Cargar documento
  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentsService.getOne(documentId),
    enabled: !!documentId && !isNaN(documentId),
  });

  // Mutación para eliminar
  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentsService.delete(id),
    onSuccess: () => {
      toast.success('Documento eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.push('/dashboard/documents');
    },
    onError: () => {
      toast.error('Error al eliminar documento');
    },
  });

  const canEdit =
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
    if (doc && isPreviewable(doc.mimetype)) {
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const loadPreview = async () => {
    if (!doc) return;

    setLoadingPreview(true);
    try {
      const blob = await documentsService.view(doc.id);
      const typedBlob = new Blob([blob], { type: doc.mimetype });
      const url = window.URL.createObjectURL(typedBlob);
      setPreviewUrl(url);
    } catch {
      toast.error('Error al cargar la vista previa');
    } finally {
      setLoadingPreview(false);
    }
  };

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
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error al descargar archivo');
    }
  };

  const handleDelete = () => {
    if (!doc) return;
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
                {doc.documentNumber && (
                  <p className="font-mono text-sm text-muted-foreground mb-0.5">{doc.documentNumber}</p>
                )}
                <h1 className="text-3xl font-bold">{doc.filename}</h1>
                {doc.isComposite && (
                  <Badge variant="secondary" className="gap-1 mt-1 w-fit">
                    <Layers className="h-3 w-3" />
                    Informe Compuesto
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
              {doc.description || 'Sin descripción'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              onClick={() =>
                router.push(
                  doc.templateId
                    ? `/dashboard/documents/${doc.id}/edit-form`
                    : `/dashboard/documents/${doc.id}/edit`,
                )
              }
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
              {canExplainPermissions && (
                <>
                  <DropdownMenuItem onClick={() => setShowExplainDialog(true)}>
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Auditar Accesos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar información
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowReplaceDialog(true)}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Reemplazar archivo
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
                <History className="mr-2 h-4 w-4" />
                Historial de versiones
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
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
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center h-[600px]">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground mt-4">Cargando vista previa...</p>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px] border rounded-md"
                  title={doc.filename}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4" />
                  <p>Vista previa no disponible para este tipo de archivo</p>
                  <p className="text-sm mt-1">{formatMimeType(doc.mimetype)}</p>
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
                    {doc.documentNumber ? (
                      <p className="text-sm font-mono text-foreground">{doc.documentNumber}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sin asignar</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <FileType className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tipo de archivo</p>
                    <p className="text-sm text-muted-foreground">{formatMimeType(doc.mimetype)}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tamaño</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(doc.size)}</p>
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

          {/* Categorías y Secciones */}
          <Card>
            <CardHeader>
              <CardTitle>Clasificación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doc.category && (
                  <div>
                    <p className="text-sm font-medium mb-2">Categoría</p>
                    <Badge variant="outline" style={{ borderColor: doc.category.color }}>
                      <span style={{ color: doc.category.color }}>{doc.category.name}</span>
                    </Badge>
                  </div>
                )}

                {doc.category?.section && (
                  <div>
                    <p className="text-sm font-medium mb-2">Sección</p>
                    <Badge variant="outline" style={{ borderColor: doc.category.section.color }}>
                      <span style={{ color: doc.category.section.color }}>{doc.category.section.name}</span>
                    </Badge>
                  </div>
                )}

                {!doc.category && (
                  <p className="text-sm text-muted-foreground">Sin clasificación</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow */}
          <DocumentWorkflowCard documentId={documentId} categoryId={doc?.categoryId} sectionId={doc?.category?.section?.id} />

          {/* Composición */}
          <DocumentCompositionCard documentId={documentId} />

          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar información
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowReplaceDialog(true)}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Reemplazar archivo
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowVersionHistory(true)}
              >
                <History className="mr-2 h-4 w-4" />
                Ver historial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales */}
      {showEditDialog && (
        <EditDocumentDialog
          document={doc}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}

      {showVersionHistory && (
        <DocumentVersionHistory
          documentId={doc.id}
          currentVersion={doc.currentVersion || 1}
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
        />
      )}

      {showReplaceDialog && (
        <ReplaceFileDialog
          documentId={doc.id}
          documentName={doc.filename}
          open={showReplaceDialog}
          onOpenChange={setShowReplaceDialog}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar documento"
        description={`¿Estás seguro de eliminar "${doc.filename}"? El documento será enviado a la papelera.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(doc.id);
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
