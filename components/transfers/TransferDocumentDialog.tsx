"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/contexts/AuthContext";
import { transfersService } from "@/lib/services/transfers.service";
import { usersService } from "@/lib/services/users.service";
import { transferErrorMessage } from "@/lib/transfer-utils";
import type { CreateTransferDto, Document } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TransferDocumentDialogProps {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDocumentDialog({
  document,
  open,
  onOpenChange,
}: TransferDocumentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toUserId, setToUserId] = useState("");
  const [comment, setComment] = useState("");

  const isAdmin =
    user?.role === "admin" || user?.roles?.includes("admin") === true;
  const adminOverride = isAdmin && user?.id !== document.uploadedById;

  useEffect(() => {
    if (open) {
      setToUserId("");
      setComment("");
    }
  }, [open, document.id]);

  const recipients = useQuery({
    queryKey: ["transfer-recipients", document.id],
    queryFn: () => usersService.getAllForSelection(),
    enabled: open,
    retry: false,
  });
  const options = (recipients.data ?? []).filter(
    (option) => option.id !== document.uploadedById,
  );

  const mutation = useMutation({
    mutationFn: (data: CreateTransferDto) =>
      adminOverride
        ? transfersService.createForOwner(data)
        : transfersService.create(data),
    onSuccess: () => {
      toast.success(
        "Solicitud de transferencia enviada. El destinatario debe aceptarla.",
      );
      queryClient.invalidateQueries({ queryKey: ["document", document.id] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["transfers-sent"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-stats"] });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(
        transferErrorMessage(error, "No se pudo crear la transferencia"),
      ),
  });

  const submit = () => {
    if (!toUserId || mutation.isPending) return;
    mutation.mutate({
      documentId: document.id,
      toUserId,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir propiedad</DialogTitle>
          <DialogDescription>
            {adminOverride
              ? "Como administrador, puedes iniciar la transferencia en nombre del propietario actual."
              : "El destinatario recibirá una solicitud y deberá aceptarla para completar el cambio."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`transfer-recipient-${document.id}`}>
              Usuario destinatario
            </Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger id={`transfer-recipient-${document.id}`}>
                <SelectValue placeholder="Selecciona un usuario activo" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name?.trim() || option.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!recipients.isLoading && options.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay otros usuarios activos disponibles.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`transfer-comment-${document.id}`}>
              Motivo o comentario
            </Label>
            <Textarea
              id={`transfer-comment-${document.id}`}
              value={comment}
              maxLength={2000}
              placeholder="Ej. Reemplazo por cambio de responsable"
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!toUserId || mutation.isPending}
            >
              {mutation.isPending ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
