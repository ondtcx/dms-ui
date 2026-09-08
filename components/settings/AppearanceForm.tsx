"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Palette } from "lucide-react";
import { settingsService, AppearanceSettings } from "@/lib/services/settings.service";
import { useSettings } from "@/lib/contexts/SettingsContext";

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#6366f1", // indigo
];

export function AppearanceForm() {
  const { settings, refresh } = useSettings();

  const defaultAppearance: AppearanceSettings = {
    primaryColor: "#3b82f6",
    secondaryColor: "#10b981",
    theme: "system",
  };

  const [form, setForm] = useState<AppearanceSettings>(defaultAppearance);

  useEffect(() => {
    if (settings?.appearance) setForm(settings.appearance);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Partial<AppearanceSettings>) => settingsService.updateAppearance(data),
    onSuccess: () => {
      toast.success("Apariencia actualizada");
      refresh();
    },
    onError: () => toast.error("Error al actualizar apariencia"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Apariencia
        </CardTitle>
        <CardDescription>Personalización visual del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Color primario */}
          <div className="space-y-3">
            <Label>Color primario</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-gray-200"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                placeholder="#3b82f6"
                className="w-32 font-mono"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, primaryColor: c })}
                  aria-label={`Seleccionar color primario ${c}`}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.primaryColor === c ? "#1f2937" : "transparent",
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Color secundario */}
          <div className="space-y-3">
            <Label>Color secundario</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-gray-200"
              />
              <Input
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                placeholder="#10b981"
                className="w-32 font-mono"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, secondaryColor: c })}
                  aria-label={`Seleccionar color secundario ${c}`}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.secondaryColor === c ? "#1f2937" : "transparent",
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Vista previa */}
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Vista previa</p>
            <div className="flex gap-3">
              <div
                className="h-8 flex-1 rounded"
                style={{ backgroundColor: form.primaryColor }}
                title="Color primario"
              />
              <div
                className="h-8 flex-1 rounded"
                style={{ backgroundColor: form.secondaryColor }}
                title="Color secundario"
              />
            </div>
          </div>

          {/* Tema */}
          <div className="space-y-2">
            <Label htmlFor="theme-select">Tema de interfaz</Label>
            <Select
              value={form.theme}
              onValueChange={(v) => setForm({ ...form, theme: v as AppearanceSettings["theme"] })}
            >
              <SelectTrigger id="theme-select" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="system">Sistema (automático)</SelectItem>
              </SelectContent>
            </Select>
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
