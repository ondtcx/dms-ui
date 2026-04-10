'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usersService } from '@/lib/services/users.service';
import { permissionsService } from '@/lib/services/permissions.service';
import { formatRole } from '@/lib/utils';

import { UserRole } from '@/lib/types';

interface Props {
  documentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExplainPermissionsDialog({ documentId, open, onOpenChange }: Props) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  const { data: users } = useQuery({
    queryKey: ['users', 'selection'],
    queryFn: () => usersService.getAllForSelection(),
  });

  const { data: explanation, isFetching } = useQuery({
    queryKey: ['permissions', 'explain', documentId, selectedUser],
    queryFn: () => permissionsService.explainPermission({ documentId, userId: selectedUser }),
    enabled: !!selectedUser && !!documentId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" /> Auditoría de Permisos
          </DialogTitle>
          <DialogDescription>
            Selecciona un usuario para analizar su nivel de acceso sobre este documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar usuario a evaluar..." />
            </SelectTrigger>
            <SelectContent>
              {users?.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFetching ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : explanation ? (
            <div className="space-y-4 border rounded-md p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Estado de Acceso:</span>
                {explanation.hasAccess ? (
                  <Badge className="bg-green-600 hover:bg-green-700 gap-1 text-white">
                    <CheckCircle2 className="h-3 w-3" /> Permitido
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" /> Denegado
                  </Badge>
                )}
              </div>
              <div>
                <span className="font-semibold text-sm">Rol evaluado: </span>
                <span className="text-sm text-muted-foreground">{formatRole(explanation.role as unknown as UserRole)}</span>
              </div>
              <div className="space-y-2">
                <span className="font-semibold text-sm">Razones detectadas:</span>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {explanation.reasons.map((reason, i) => (
                    <li key={i} className={explanation.hasAccess ? "text-green-700 dark:text-green-400" : "text-destructive"}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}