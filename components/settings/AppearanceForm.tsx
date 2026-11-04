"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, RotateCcw, Save } from "lucide-react";
import { settingsService, AppearanceSettings } from "@/lib/services/settings.service";
import {
  normalizeHexColor,
  resolveAppearanceColors,
  resolveColorForeground,
  useSettings,
} from "@/lib/contexts/SettingsContext";

const SECONDARY_PRESETS = [
  "#047857",
  "#059669",
  "#0f766e",
  "#15803d",
  "#0891b2",
  "#4d7c0f",
];

const PRIMARY_PRESETS = [
  "#1e3a5f",
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#6366f1", // indigo
];

function relativeLuminance(hex: string): number | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const channel = (start: number) => {
    const c = parseInt(value.slice(start, start + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrastRatio(foreground: string, background: string): number | null {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg === null || bg === null) return null;
  const light = Math.max(fg, bg);
  const dark = Math.min(fg, bg);
  return (light + 0.05) / (dark + 0.05);
}

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

  const primaryForeground = resolveColorForeground(form.primaryColor);
  const secondaryForeground = resolveColorForeground(form.secondaryColor);
  const primaryContrast = contrastRatio(primaryForeground, form.primaryColor);
  const secondaryContrast = contrastRatio(secondaryForeground, form.secondaryColor);

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
            <Label htmlFor="appearance-primary-hex">Color primario</Label>
            <div className="flex items-center gap-3">
              <input
                id="appearance-primary-color"
                type="color"
                aria-label="Selector de color primario"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-border"
              />
              <Input
                id="appearance-primary-hex"
                aria-label="Color primario en hexadecimal"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                placeholder="#1e3a5f"
                className="w-32 font-mono"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {PRIMARY_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, primaryColor: c })}
                  aria-label={`Seleccionar color primario ${c}`}
                  aria-pressed={form.primaryColor === c}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
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
            <Label htmlFor="appearance-secondary-hex">Color secundario</Label>
            <div className="flex items-center gap-3">
              <input
                id="appearance-secondary-color"
                type="color"
                aria-label="Selector de color secundario"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-border"
              />
              <Input
                id="appearance-secondary-hex"
                aria-label="Color secundario en hexadecimal"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                placeholder="#047857"
                className="w-32 font-mono"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SECONDARY_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, secondaryColor: c })}
                  aria-label={`Seleccionar color secundario ${c}`}
                  aria-pressed={form.secondaryColor === c}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.secondaryColor === c ? resolveColorForeground(c) : "transparent",
                    boxShadow: form.secondaryColor === c ? `0 0 0 2px ${c}` : undefined,
                  }}
                  title={c}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              El color secundario se usa para confirmar, aprobar y emitir. Evita
              rojos y ámbar para no confundirlos con errores.
            </p>
          </div>

          {/* Vista previa */}
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium text-foreground">Vista previa</p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium"
                style={{
                  backgroundColor: form.primaryColor,
                  color: primaryForeground,
                }}
              >
                Acción primaria
              </span>
              <span
                className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium"
                style={{
                  backgroundColor: form.secondaryColor,
                  color: secondaryForeground,
                }}
              >
                Emitir y numerar
              </span>
              <span
                className="inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium"
                style={{
                  backgroundColor: form.secondaryColor,
                  color: secondaryForeground,
                }}
              >
                Aprobado
              </span>
              <span className="inline-flex h-6 items-center rounded-full border border-border bg-muted px-2 text-[11px] font-medium text-muted-foreground">
                Borrador
              </span>
            </div>
            {primaryContrast !== null && primaryContrast < 4.5 && (
              <p role="alert" className="text-xs text-destructive">
                El texto sobre el color primario no alcanza contraste AA
                (4.5:1).
              </p>
            )}
            {secondaryContrast !== null && secondaryContrast < 4.5 && (
              <p role="alert" className="text-xs text-destructive">
                El texto sobre el color secundario no alcanza contraste AA
                (4.5:1).
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm({
                  ...form,
                  primaryColor: "#1e3a5f",
                  secondaryColor: "#047857",
                })
              }
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar paleta institucional
            </Button>
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
