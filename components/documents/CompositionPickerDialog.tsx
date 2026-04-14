'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileText, AlertTriangle, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsService } from '@/lib/services/documents.service';
import { compositionService } from '@/lib/services/composition.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  parentId: number;
  alreadyAddedIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

function getMimeLabel(mimetype: string): { label: string; color: string } {
  if (mimetype === 'application/pdf') return { label: 'PDF', color: '#16a34a' };
  if (mimetype.includes('word')) return { label: 'DOCX', color: '#d97706' };
  if (mimetype.includes('sheet')) return { label: 'XLSX', color: '#d97706' };
  if (mimetype.includes('presentation')) return { label: 'PPTX', color: '#d97706' };
  if (mimetype.startsWith('image/')) return { label: 'Imagen', color: '#7c3aed' };
  return { label: 'Archivo', color: '#6b7280' };
}

export function CompositionPickerDialog({ parentId, alreadyAddedIds, open, onOpenChange, onAdded }: Props) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['documents-picker', search],
    queryFn: () =>
      documentsService.getAll({
        search: search || undefined,
        excludeComposites: true,
        limit: 20,
        page: 1,
      }),
    enabled: open,
    staleTime: 10000,
  });

  const addMutation = useMutation({
    mutationFn: (childId: number) => compositionService.addComponent(parentId, { childId }),
    onSuccess: () => {
      toast.success('Documento agregado al informe');
      queryClient.invalidateQueries({ queryKey: ['composition', parentId] });
      queryClient.invalidateQueries({ queryKey: ['document', parentId] });
      onAdded();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al agregar documento');
    },
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const documents = data?.data ?? [];
  const excluded = new Set([parentId, ...alreadyAddedIds]);

  const filtered = documents.filter((doc: any) => !excluded.has(doc.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar documento al informe</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            className="pl-9"
            value={search}
            onChange={handleSearch}
          />
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <FileText className="h-10 w-10 mb-2" />
              <p className="text-sm">No se encontraron documentos</p>
            </div>
          ) : (
            <div className="space-y-1 pr-2">
              {filtered.map((doc: any) => {
                const mime = getMimeLabel(((doc?.versions?.[0]?.mimetype) ?? ''));
                const isNonPdf = ((doc?.versions?.[0]?.mimetype) ?? '') !== 'application/pdf' && !doc.templateId;
                const isAdding = addMutation.isPending && addMutation.variables === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{((doc?.versions?.[0]?.filename) ?? '')}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.documentNumber && (
                          <span className="text-xs font-mono text-muted-foreground">{doc.documentNumber}</span>
                        )}
                        {doc.category && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0"
                            style={{ borderColor: doc.category.color, color: doc.category.color }}
                          >
                            {doc.category.name}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                          style={{ borderColor: mime.color, color: mime.color }}
                        >
                          {mime.label}
                        </Badge>
                      </div>
                      {isNonPdf && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Solo como referencia, no incluido en el PDF
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={isAdding}
                      onClick={() => addMutation.mutate(doc.id)}
                    >
                      {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
