"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, X, Plus } from "lucide-react";
import { settingsService, DocumentSettings } from "@/lib/services/settings.service";
import { useSettings } from "@/lib/contexts/SettingsContext";

const COMMON_MIME_TYPES = [
  { label: "PDF", value: "application/pdf" },
  { label: "JPEG", value: "image/jpeg" },
  { label: "PNG", value: "image/png" },
  { label: "Word (.doc)", value: "application/msword" },
  {
    label: "Word (.docx)",
    value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  { label: "Excel (.xls)", value: "application/vnd.ms-excel" },
  {
    label: "Excel (.xlsx)",
    value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  { label: "PowerPoint (.pptx)", value: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  { label: "Texto plano", value: "text/plain" },
  { label: "GIF", value: "image/gif" },
  { label: "WebP", value: "image/webp" },
];

export function DocumentSettingsForm() {
  const { settings, refresh } = useSettings();

  const defaultDocSettings: DocumentSettings = {
    maxFileSizeMb: 50,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    trashRetentionDays: 30,
    maxVersionsPerDocument: 10,
  };

  const [form, setForm] = useState<DocumentSettings>(defaultDocSettings);
  const [customMime, setCustomMime] = useState("");

  useEffect(() => {
    if (settings?.documents) setForm(settings.documents);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Partial<DocumentSettings>) => settingsService.updateDocuments(data),
    onSuccess: () => {
      toast.success("Configuración de documentos actualizada");
      refresh();
    },
    onError: () => toast.error("Error al actualizar configuración"),
  });

  const toggleMime = (mime: string) => {
    const current = form.allowedMimeTypes;
    if (current.includes(mime)) {
      setForm({ ...form, allowedMimeTypes: current.filter((m) => m !== mime) });
    } else {
      setForm({ ...form, allowedMimeTypes: [...current, mime] });
    }
  };

  const addCustomMime = () => {
    const trimmed = customMime.trim();
    if (!trimmed || form.allowedMimeTypes.includes(trimmed)) return;
    setForm({ ...form, allowedMimeTypes: [...form.allowedMimeTypes, trimmed] });
    setCustomMime("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos
        </CardTitle>
        <CardDescription>Límites y restricciones para documentos del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="max-size">Tamaño máximo (MB)</Label>
              <Input
                id="max-size"
                type="number"
                min={1}
                max={500}
                value={form.maxFileSizeMb}
                onChange={(e) =>
                  setForm({ ...form, maxFileSizeMb: parseInt(e.target.value) || 50 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trash-days">Retención en papelera (días)</Label>
              <Input
                id="trash-days"
                type="number"
                min={1}
                max={365}
                value={form.trashRetentionDays}
                onChange={(e) =>
                  setForm({ ...form, trashRetentionDays: parseInt(e.target.value) || 30 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-versions">Versiones máximas</Label>
              <Input
                id="max-versions"
                type="number"
                min={1}
                max={50}
                value={form.maxVersionsPerDocument}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxVersionsPerDocument: parseInt(e.target.value) || 10,
                  })
                }
              />
            </div>
          </div>

          {/* Tipos permitidos */}
          <div className="space-y-3">
            <Label>Tipos de archivo permitidos</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_MIME_TYPES.map(({ label, value }) => {
                const active = form.allowedMimeTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleMime(value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* MIME personalizados ya seleccionados */}
            {form.allowedMimeTypes
              .filter((m) => !COMMON_MIME_TYPES.some((c) => c.value === m))
              .map((m) => (
                <Badge key={m} variant="secondary" className="gap-1">
                  {m}
                  <button type="button" onClick={() => toggleMime(m)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

            {/* Agregar MIME personalizado */}
            <div className="flex gap-2">
              <Input
                value={customMime}
                onChange={(e) => setCustomMime(e.target.value)}
                placeholder="application/x-custom"
                className="max-w-xs text-sm"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomMime())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomMime}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {mutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
