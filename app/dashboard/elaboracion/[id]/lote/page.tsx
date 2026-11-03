'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  FilePlus2,
  Loader2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authoringService } from '@/lib/services/authoring.service';
import { batchService } from '@/lib/services/batch.service';
import { AuthoringDocumentForm } from '@/components/authoring/AuthoringDocumentForm';
import { AuthoringStatusBadge } from '@/components/authoring/AuthoringStatusBadge';
import { fieldsOf } from '@/lib/authoring/fields';
import type { AuthoringDocument } from '@/lib/types/authoring';

interface BatchResult {
  documents: AuthoringDocument[];
  errors: string[];
}

function BatchContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = Number(params.id);
  const [commonForm, setCommonForm] = useState<Record<string, any>>({});
  const [recipientsText, setRecipientsText] = useState('');
  const [result, setResult] = useState<BatchResult | null>(null);
  const [generating, setGenerating] = useState(false);

  const query = useQuery({
    queryKey: ['authoring-template', templateId],
    queryFn: () => authoringService.getTemplate(templateId),
    enabled: Number.isSafeInteger(templateId) && templateId > 0,
  });
  const template = query.data;
  const published = template?.versions.find((version) => version.status === 'PUBLISHED');
  const fields = useMemo(() => (published ? fieldsOf(published.fields) : []), [published]);
  const hasRecipient = fields.some((field) => field.key === 'destinatario.nombre');
  const requiresCargo = fields.some(
    (field) => field.key === 'destinatario.cargo',
  );

  const generate = async () => {
    if (!published) return;
    const lines = recipientsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error('Agrega al menos un destinatario');
      return;
    }
    if (lines.length > 50) {
      toast.error('El máximo es 50 destinatarios por lote');
      return;
    }

    const recipients = lines.map((line) => {
      const [nombre, cargo] = line.split('|').map((part) => part.trim());
      return {
        formData: {
          destinatario: {
            nombre: nombre ?? '',
            cargo: cargo ?? '',
          },
        },
      };
    });

    if (requiresCargo && recipients.some((recipient) => !recipient.formData.destinatario.cargo)) {
      toast.error('Cada destinatario debe tener el formato Nombre | Cargo');
      return;
    }

    const common = { ...commonForm };
    delete common.destinatario;

    setGenerating(true);
    try {
      const response = await authoringService.batch({
        templateVersionId: published.id,
        commonFormData: common,
        recipients,
      });
      setResult(response);
      toast.success(`${response.documents.length} borrador(es) creado(s)`);
    } catch {
      toast.error('No se pudo generar el lote. Revisa los campos obligatorios.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadZip = async () => {
    if (!result?.documents.length) return;
    try {
      await batchService.downloadExport(
        result.documents.map((document) => document.id),
        'documentos-institucionales.zip',
      );
    } catch {
      toast.error('No se pudo generar el ZIP');
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando plantilla...
      </div>
    );
  }

  if (!template || !published) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">La plantilla no tiene una versión publicada.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/elaboracion')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  if (!hasRecipient) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Esta plantilla no tiene un campo de destinatario único. Usa el editor normal.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => router.push(`/dashboard/elaboracion/${template.id}/nuevo`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <Button
        variant="ghost"
        className="w-fit"
        onClick={() => router.push(`/dashboard/elaboracion/${template.id}/nuevo`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Inicio de la plantilla
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Generar para varios destinatarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {template.name} · versión {published.version}. El contenido común se comparte y cada
          destinatario recibe un documento individual.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenido común</CardTitle>
        </CardHeader>
        <CardContent>
          <AuthoringDocumentForm
            templateVersion={published}
            excludedFields={['destinatario.nombre', 'destinatario.cargo', 'destinatario.dependencia']}
            onChange={(formData) => setCommonForm(formData)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Destinatarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Un destinatario por línea con el formato{' '}
            <code>Nombre | Cargo</code>. Máximo 50.
          </p>
          <textarea
            className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={recipientsText}
            onChange={(event) => setRecipientsText(event.target.value)}
            placeholder={'Ana Pérez | Directora\nLuis Gómez | Coordinador'}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/dashboard/elaboracion')}>
          Cancelar
        </Button>
        <Button onClick={generate} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FilePlus2 className="mr-2 h-4 w-4" />
          )}
          Generar borradores
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Resultado: {result.documents.length} documento(s)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={downloadZip}>
              <Download className="mr-1.5 h-4 w-4" /> Descargar ZIP
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.errors.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                {result.errors.map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            )}
            {result.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-2 border-b border-border py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/dashboard/elaboracion/${document.id}`}
                    className="font-medium hover:underline"
                  >
                    {document.name || `Documento #${document.id}`}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <AuthoringStatusBadge status={document.authoring.status} />
                    <span>{document.templateData?.template?.name}</span>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/elaboracion/${document.id}/editar`}>Abrir borrador</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AuthoringBatchPage() {
  return (
    <ProtectedRoute>
      <BatchContent />
    </ProtectedRoute>
  );
}
