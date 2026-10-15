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
import {
  normalizeHexColor,
  resolveAppearanceColors,
  resolveColorForeground,
  useSettings,
} from "@/lib/contexts/SettingsContext";

const PRESET_COLORS = [
  "#1e3a5f",
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

  const [form, setForm] = useState<AppearanceSettings>(() => resolveAppearanceColors());

  useEffect(() => {
    if (settings) setForm(resolveAppearanceColors(settings.appearance));
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: AppearanceSettings) => settingsService.updateAppearance(data),
    onSuccess: () => {
      toast.success("Apariencia actualizada");
      refresh();
    },
    onError: () => toast.error("Error al actualizar apariencia"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const primaryColor = normalizeHexColor(form.primaryColor.trim());
    const secondaryColor = normalizeHexColor(form.secondaryColor.trim());

    if (!primaryColor || !secondaryColor) {
      toast.error("Introduce colores hexadecimales válidos.");
      return;
    }

    mutation.mutate({
      primaryColor,
      secondaryColor,
      theme: resolveAppearanceColors({ theme: form.theme }).theme,
    });
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
                  aria-pressed={form.primaryColor === c}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.primaryColor === c ? resolveColorForeground(c) : "transparent",
                    boxShadow: form.primaryColor === c ? `0 0 0 2px ${c}` : undefined,
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
                  aria-pressed={form.secondaryColor === c}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.secondaryColor === c ? resolveColorForeground(c) : "transparent",
                    boxShadow: form.secondaryColor === c ? `0 0 0 2px ${c}` : undefined,
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
                className="flex h-8 flex-1 items-center rounded px-2 text-xs font-medium"
                style={{ backgroundColor: form.primaryColor, color: resolveColorForeground(form.primaryColor) }}
                title="Color primario"
              >
                Primario
              </div>
              <div
                className="flex h-8 flex-1 items-center rounded px-2 text-xs font-medium"
                style={{ backgroundColor: form.secondaryColor, color: resolveColorForeground(form.secondaryColor) }}
                title="Color secundario"
              >
                Secundario
              </div>
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
