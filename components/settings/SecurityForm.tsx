"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, ShieldCheck } from "lucide-react";
import { settingsService, SecuritySettings } from "@/lib/services/settings.service";
import { useSettings } from "@/lib/contexts/SettingsContext";

export function SecurityForm() {
  const { settings, refresh } = useSettings();

  const defaultSecurity: SecuritySettings = {
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5,
    require2FA: false,
  };

  const [form, setForm] = useState<SecuritySettings>(defaultSecurity);

  useEffect(() => {
    if (settings?.security) setForm(settings.security);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Partial<SecuritySettings>) => settingsService.updateSecurity(data),
    onSuccess: () => {
      toast.success("Configuración de seguridad actualizada");
      refresh();
    },
    onError: () => toast.error("Error al actualizar seguridad"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const sessionHours = (form.sessionTimeoutMinutes / 60).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Seguridad
        </CardTitle>
        <CardDescription>Políticas de acceso y autenticación del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">
                Tiempo de sesión (minutos)
                <span className="ml-2 text-xs text-gray-400">≈ {sessionHours} h</span>
              </Label>
              <Input
                id="session-timeout"
                type="number"
                min={5}
                max={1440}
                value={form.sessionTimeoutMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sessionTimeoutMinutes: parseInt(e.target.value) || 480,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Mínimo 5 min · Máximo 1440 min (24 h)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-attempts">Intentos de login máximos</Label>
              <Input
                id="max-attempts"
                type="number"
                min={1}
                max={20}
                value={form.maxLoginAttempts}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxLoginAttempts: parseInt(e.target.value) || 5,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Intentos fallidos antes de bloquear la cuenta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Switch
              id="require-2fa"
              checked={form.require2FA}
              onCheckedChange={(v) => setForm({ ...form, require2FA: v })}
            />
            <div>
              <Label htmlFor="require-2fa" className="cursor-pointer font-medium">
                Requerir autenticación de dos factores (2FA)
              </Label>
              <p className="text-xs text-gray-500">
                Todos los usuarios deberán configurar 2FA para iniciar sesión
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
