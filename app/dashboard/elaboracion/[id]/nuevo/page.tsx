'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, FilePlus2, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authoringService } from '@/lib/services/authoring.service';
import { fieldsOf } from '@/lib/authoring/fields';

function NewDocumentContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = Number(params.id);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templateQuery = useQuery({
    queryKey: ['authoring-template', templateId],
    queryFn: () => authoringService.getTemplate(templateId),
    enabled: Number.isSafeInteger(templateId) && templateId > 0,
  });

  const template = templateQuery.data;
  const published = template?.versions.find((version) => version.status === 'PUBLISHED');

  const createDraft = async () => {
    if (!published) return;
    setCreating(true);
    setError(null);
    try {
      const document = await authoringService.createDocument({
        templateVersionId: published.id,
      });
      router.replace(`/dashboard/elaboracion/${document.id}/editar`);
    } catch {
      setError('No se pudo crear el borrador. Intenta nuevamente.');
      setCreating(false);
    }
  };

  const preview = async () => {
    if (!template) return;
    const blob = await authoringService.previewTemplate(template.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (templateQuery.isLoading) {
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

  const fields = published ? fieldsOf(published.fields) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <Button variant="ghost" className="w-fit" onClick={() => router.push('/dashboard/elaboracion')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Biblioteca
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <CardDescription>
            {template.description || 'Plantilla institucional'}
            {published ? ` · versión ${published.version}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!published ? (
            <p className="text-sm text-destructive">
              Esta plantilla todavía no tiene una versión publicada.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium">Campos del documento</h3>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {fields.map((field) => (
                    <li key={field.key}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </li>
                  ))}
                </ul>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={createDraft} disabled={creating}>
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus2 className="mr-2 h-4 w-4" />
                  )}
                  Crear borrador
                </Button>
                <Button variant="outline" onClick={preview}>
                  <Eye className="mr-2 h-4 w-4" /> Previsualizar plantilla
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <ProtectedRoute>
      <NewDocumentContent />
    </ProtectedRoute>
  );
}
