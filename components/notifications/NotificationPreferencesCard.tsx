'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { notificationsService } from '@/lib/services/notifications.service';

export function NotificationPreferencesCard() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsService.getPreferences(),
  });
  const [inAppEnabled, setInAppEnabled] = useState(true);

  useEffect(() => {
    if (query.data) setInAppEnabled(query.data.inAppEnabled);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => notificationsService.updatePreferences(inAppEnabled),
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-preferences'], data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Preferencias de notificaciones actualizadas');
    },
    onError: () => toast.error('No se pudieron actualizar las preferencias'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificaciones en la aplicación
        </CardTitle>
        <CardDescription>
          Controla si deseas recibir avisos dentro del sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando preferencias...</p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            No se pudieron cargar las preferencias.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id="in-app-notifications"
                checked={inAppEnabled}
                onCheckedChange={setInAppEnabled}
              />
              <div>
                <Label htmlFor="in-app-notifications" className="cursor-pointer font-medium">
                  Avisos en la aplicación
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se aplica a revisiones, plantillas y transferencias.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {mutation.isPending ? 'Guardando...' : 'Guardar preferencias'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
