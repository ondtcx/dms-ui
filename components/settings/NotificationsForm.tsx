"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Bell } from "lucide-react";
import { settingsService, NotificationSettings } from "@/lib/services/settings.service";
import { useSettings } from "@/lib/contexts/SettingsContext";

export function NotificationsForm() {
  const { settings, refresh } = useSettings();

  const defaultNotifications: NotificationSettings = {
    emailEnabled: false,
    senderEmail: null,
    senderName: null,
  };

  const [form, setForm] = useState<NotificationSettings>(defaultNotifications);

  useEffect(() => {
    if (settings?.notifications) setForm(settings.notifications);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Partial<NotificationSettings>) => settingsService.updateNotifications(data),
    onSuccess: () => {
      toast.success("Configuración de notificaciones actualizada");
      refresh();
    },
    onError: () => toast.error("Error al actualizar notificaciones"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificaciones
        </CardTitle>
        <CardDescription>Configuración de envío de notificaciones por email</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Switch
              id="email-enabled"
              checked={form.emailEnabled}
              onCheckedChange={(v) => setForm({ ...form, emailEnabled: v })}
            />
            <div>
              <Label htmlFor="email-enabled" className="cursor-pointer font-medium">
                Habilitar notificaciones por email
              </Label>
              <p className="text-xs text-gray-500">
                Envía correos automáticos para eventos importantes del sistema
              </p>
            </div>
          </div>

          <div
            className={`space-y-4 transition-opacity ${form.emailEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}
          >
            <div className="space-y-2">
              <Label htmlFor="sender-name">Nombre del remitente</Label>
              <Input
                id="sender-name"
                value={form.senderName ?? ""}
                onChange={(e) => setForm({ ...form, senderName: e.target.value || null })}
                placeholder="Sistema DMS Colegio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender-email">Email del remitente</Label>
              <Input
                id="sender-email"
                type="email"
                value={form.senderEmail ?? ""}
                onChange={(e) => setForm({ ...form, senderEmail: e.target.value || null })}
                placeholder="noreply@colegio.edu"
              />
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
