"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, CalendarDays } from "lucide-react";
import { settingsService, SchoolYearSettings } from "@/lib/services/settings.service";
import { useSettings } from "@/lib/contexts/SettingsContext";

export function SchoolYearForm() {
  const { settings, refresh } = useSettings();

  const defaultSchoolYear: SchoolYearSettings = {
    name: "",
    startDate: null,
    endDate: null,
    isActive: true,
  };

  const [form, setForm] = useState<SchoolYearSettings>(defaultSchoolYear);

  useEffect(() => {
    if (settings?.schoolYear) setForm(settings.schoolYear);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Partial<SchoolYearSettings>) => settingsService.updateSchoolYear(data),
    onSuccess: () => {
      toast.success("Ciclo escolar actualizado");
      refresh();
    },
    onError: () => toast.error("Error al actualizar ciclo escolar"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Ciclo Escolar
        </CardTitle>
        <CardDescription>Parámetros del ciclo escolar actual</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cy-name">Nombre del ciclo *</Label>
              <Input
                id="cy-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="2025-2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cy-start">Fecha de inicio</Label>
              <Input
                id="cy-start"
                type="date"
                value={form.startDate ?? ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cy-end">Fecha de fin</Label>
              <Input
                id="cy-end"
                type="date"
                value={form.endDate ?? ""}
                onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Switch
              id="cy-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <div>
              <Label htmlFor="cy-active" className="cursor-pointer font-medium">
                Ciclo activo
              </Label>
              <p className="text-xs text-gray-500">
                Marca este ciclo como el período lectivo en curso
              </p>
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
