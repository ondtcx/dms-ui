'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  X,
  Download,
  FileText,
  Layers,
  Link2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compositionService } from '@/lib/services/composition.service';
import { DocumentCompositionItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CompositionPickerDialog } from './CompositionPickerDialog';
import Link from 'next/link';

interface SortableItemProps {
  item: DocumentCompositionItem;
  onRemove: (childId: number) => void;
  isRemoving: boolean;
}

function getMimeLabel(mimetype: string): { label: string; color: string } {
  if (mimetype === 'application/pdf') return { label: 'PDF', color: '#16a34a' };
  if (mimetype.includes('word')) return { label: 'DOCX', color: '#d97706' };
  if (mimetype.includes('sheet')) return { label: 'XLSX', color: '#d97706' };
  if (mimetype.startsWith('image/')) return { label: 'IMG', color: '#7c3aed' };
  return { label: 'Archivo', color: '#6b7280' };
}

function SortableItem({ item, onRemove, isRemoving }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.childId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const mime = getMimeLabel(item.child.mimetype);
  const isNonPdf = item.child.mimetype !== 'application/pdf' && !item.child.templateId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/30 transition-colors"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <Link
          href={`/dashboard/documents/${item.childId}`}
          className="text-sm font-medium truncate hover:underline block"
        >
          {item.label || item.child.filename}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.child.documentNumber && (
            <span className="text-xs font-mono text-muted-foreground">{item.child.documentNumber}</span>
          )}
          <Badge
            variant="outline"
            className="text-xs px-1.5 py-0"
            style={{ borderColor: mime.color, color: mime.color }}
          >
            {mime.label}
          </Badge>
          {isNonPdf && (
            <span title="No incluido en el PDF mergeado">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={isRemoving}
        onClick={() => onRemove(item.childId)}
      >
        {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      </Button>
    </div>
  );
}

interface Props {
  documentId: number;
}

export function DocumentCompositionCard({ documentId }: Props) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['composition', documentId],
    queryFn: () => compositionService.getComposition(documentId),
  });

  const removeMutation = useMutation({
    mutationFn: (childId: number) => compositionService.removeComponent(documentId, childId),
    onMutate: (childId) => setRemovingId(childId),
    onSuccess: () => {
      toast.success('Documento quitado del informe');
      queryClient.invalidateQueries({ queryKey: ['composition', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: () => toast.error('Error al quitar el documento'),
    onSettled: () => setRemovingId(null),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { childId: number; order: number }[]) =>
      compositionService.reorder(documentId, items),
    onError: () => {
      toast.error('Error al reordenar');
      queryClient.invalidateQueries({ queryKey: ['composition', documentId] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (isLoading || !data) return null;

  const { components, partOf } = data;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = components.findIndex((c) => c.childId === active.id);
    const newIndex = components.findIndex((c) => c.childId === over.id);
    const reordered = arrayMove(components, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['composition', documentId], (old: any) => ({
      ...old,
      components: reordered.map((item, idx) => ({ ...item, order: idx })),
    }));

    reorderMutation.mutate(
      reordered.map((item, idx) => ({ childId: item.childId, order: idx })),
    );
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await compositionService.downloadMerged(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe-${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error al generar el PDF del informe');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Composición
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sección: documentos incluidos (padre) */}
          {(data.isComposite || components.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Documentos incluidos
              </p>

              {components.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Sin componentes aún</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={components.map((c) => c.childId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {components.map((item) => (
                        <SortableItem
                          key={item.childId}
                          item={item}
                          onRemove={(childId) => removeMutation.mutate(childId)}
                          isRemoving={removingId === item.childId}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowPicker(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar documento
              </Button>

              {components.some((c) => c.child.mimetype !== 'application/pdf' && !c.child.templateId) && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Los archivos con ⚠ no se incluyen en el PDF combinado
                </p>
              )}

              {components.length > 0 && (
                <>
                  <Separator />
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={isDownloading}
                    onClick={handleDownload}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3 mr-2" />
                    )}
                    Descargar informe completo
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Sección: parte de (hijo) */}
          {partOf.length > 0 && (
            <>
              {(data.isComposite || components.length > 0) && <Separator />}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Parte de
                </p>
                <div className="space-y-1">
                  {partOf.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/dashboard/documents/${rel.parent.id}`}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{rel.parent.filename}</p>
                        {rel.parent.documentNumber && (
                          <p className="text-xs font-mono text-muted-foreground">{rel.parent.documentNumber}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Estado vacío: sin componentes y sin relación partOf */}
          {components.length === 0 && partOf.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Este documento puede agrupar otros documentos (actas, anexos, reportes).
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowPicker(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar documento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CompositionPickerDialog
        parentId={documentId}
        alreadyAddedIds={components.map((c) => c.childId)}
        open={showPicker}
        onOpenChange={setShowPicker}
        onAdded={() => setShowPicker(false)}
      />
    </>
  );
}
