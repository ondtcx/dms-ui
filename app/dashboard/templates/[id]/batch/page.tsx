'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { templatesService } from '@/lib/services/templates.service';
import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Download,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TemplateField } from '@/lib/types';
import { generateCsvTemplate, downloadCsvFile, parseCsvFile } from '@/lib/csv-utils';

type RowData = Record<string, string>;

interface BatchMeta {
  batchName: string;
  isPublic: boolean;
}

export default function BatchCreationPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = parseInt(params.id as string);

  const { register, watch } = useForm<BatchMeta>({
    defaultValues: { batchName: '', isPublic: false },
  });
  const batchName = watch('batchName');
  const isPublic = watch('isPublic');

  // Table rows state
  const [rows, setRows] = useState<RowData[]>([{}]);
  // CSV import state
  const [csvRows, setCsvRows] = useState<RowData[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'csv'>('table');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templatesService.getOne(templateId),
    enabled: !!templateId && !isNaN(templateId),
  });

  const fields: TemplateField[] = template?.fields?.fields ?? [];

  // ── Table helpers ──────────────────────────────────────────────

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, {}]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCell = useCallback((rowIndex: number, fieldName: string, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [fieldName]: value };
      return next;
    });
  }, []);

  // ── CSV helpers ─────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    if (!fields.length) return;
    const csv = generateCsvTemplate(fields);
    downloadCsvFile(csv, `plantilla-${template?.name ?? 'lote'}.csv`);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await parseCsvFile(file, fields);
    setCsvRows(result.rows);
    setCsvErrors(result.errors);
    // reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const sourceRows = activeTab === 'table' ? rows : csvRows;

    if (sourceRows.length === 0) {
      toast.error('Agrega al menos una fila de datos');
      return;
    }

    // Validate required fields
    const invalid = sourceRows.some((row) =>
      fields.some((f) => f.required && !row[f.name]?.trim()),
    );
    if (invalid) {
      toast.error('Completa todos los campos requeridos en cada fila');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await templatesService.createBatchFromTemplate({
        templateId,
        batchName: batchName || undefined,
        rows: sourceRows.map((row) => ({ formData: row as Record<string, unknown> })),
        isPublic,
      });

      if (result.errors.length > 0) {
        toast.success(`${result.documents.length} documentos generados (${result.errors.length} con errores)`);
      } else {
        toast.success(`${result.documents.length} documentos generados exitosamente`);
      }

      router.push(`/dashboard/documents/batches/${result.batch.id}`);
    } catch {
      toast.error('Error al generar los documentos');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Plantilla no encontrada</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const activeRows = activeTab === 'table' ? rows : csvRows;
  const canGenerate = activeRows.length > 0 && !isGenerating;

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Generación en Lote</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Plantilla: <span className="font-medium">{template.name}</span>
            </p>
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={!canGenerate} size="lg">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando…
            </>
          ) : (
            <>
              <Layers className="mr-2 h-4 w-4" />
              Generar {activeRows.length > 0 ? `${activeRows.length} ` : ''}Documentos
            </>
          )}
        </Button>
      </div>

      {isGenerating && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Generando documentos, esto puede tardar varios minutos dependiendo de la cantidad de filas…
          </AlertDescription>
        </Alert>
      )}

      {/* Shared metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Lote</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batchName">Nombre del lote (opcional)</Label>
            <Input
              id="batchName"
              placeholder={`Lote de ${template.name} - ${new Date().toLocaleDateString('es')}`}
              {...register('batchName')}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch id="isPublic" {...register('isPublic')} />
            <Label htmlFor="isPublic">Documentos públicos</Label>
          </div>
        </CardContent>
      </Card>

      {/* Data input */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'csv')}>
        <TabsList>
          <TabsTrigger value="table">Tabla manual</TabsTrigger>
          <TabsTrigger value="csv">Importar CSV</TabsTrigger>
        </TabsList>

        {/* ── Manual table ── */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Datos ({rows.length} fila{rows.length !== 1 ? 's' : ''})</CardTitle>
              <Button variant="outline" size="sm" onClick={addRow} disabled={rows.length >= 50}>
                <Plus className="mr-2 h-4 w-4" /> Agregar fila
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">Esta plantilla no tiene campos definidos.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 w-10">#</th>
                      {fields.map((f) => (
                        <th key={f.name} className="text-left p-2 min-w-[160px]">
                          {f.label || f.name}
                          {f.required && <span className="text-destructive ml-1">*</span>}
                        </th>
                      ))}
                      <th className="p-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{rowIdx + 1}</td>
                        {fields.map((f) => (
                          <td key={f.name} className="p-1">
                            {f.type === 'textarea' ? (
                              <Textarea
                                rows={2}
                                value={row[f.name] ?? ''}
                                onChange={(e) => updateCell(rowIdx, f.name, e.target.value)}
                                className="min-w-[160px] text-sm resize-none"
                              />
                            ) : (
                              <Input
                                type={f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                                value={row[f.name] ?? ''}
                                onChange={(e) => updateCell(rowIdx, f.name, e.target.value)}
                                className="min-w-[160px] text-sm"
                              />
                            )}
                          </td>
                        ))}
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(rowIdx)}
                            disabled={rows.length === 1}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CSV import ── */}
        <TabsContent value="csv" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar desde CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar plantilla CSV
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir archivo CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
              </div>

              {csvErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1">
                      {csvErrors.map((err, i) => (
                        <li key={i} className="text-sm">{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {csvRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">
                      {csvRows.length} fila{csvRows.length !== 1 ? 's' : ''} válida{csvRows.length !== 1 ? 's' : ''} listas para generar
                    </span>
                    {csvErrors.length > 0 && (
                      <Badge variant="destructive">{csvErrors.length} con errores</Badge>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 w-10">#</th>
                          {fields.map((f) => (
                            <th key={f.name} className="text-left p-2">{f.label || f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.map((row, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            {fields.map((f) => (
                              <td key={f.name} className="p-2 max-w-[200px] truncate">{row[f.name] ?? ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {csvRows.length === 0 && csvErrors.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Descarga la plantilla CSV, llena los datos y vuelve a subirla.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
