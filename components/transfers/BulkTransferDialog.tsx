"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { transfersService } from "@/lib/services/transfers.service";
import { usersService } from "@/lib/services/users.service";
import { transferErrorMessage } from "@/lib/transfer-utils";
import type { BulkTransferResult, User } from "@/lib/types";
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

interface BulkTransferDialogProps {
  owner: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkTransferDialog({
  owner,
  open,
  onOpenChange,
}: BulkTransferDialogProps) {
  const queryClient = useQueryClient();
  const [toUserId, setToUserId] = useState("");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<BulkTransferResult | null>(null);

  useEffect(() => {
    if (open) {
      setToUserId("");
      setComment("");
      setResult(null);
    }
  }, [open, owner.id]);

  const recipients = useQuery({
    queryKey: ["transfer-recipients", "bulk", owner.id],
    queryFn: () => usersService.getAllForSelection(),
    enabled: open,
    retry: false,
  });
  const options = (recipients.data ?? []).filter(
    (option) => option.id !== owner.id,
  );

  const mutation = useMutation({
    mutationFn: () =>
      transfersService.createBulkForOwner({
        fromOwnerId: owner.id,
        toUserId,
        comment: comment.trim() || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["transfers-sent"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-stats"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (data.summary.created > 0) {
        toast.success(
          `Lote enviado: ${data.summary.created} documento(s) pendientes de aceptación`,
        );
      } else {
        toast.error("No se pudo incluir ningún documento en el lote");
      }
    },
    onError: (error) =>
      toast.error(transferErrorMessage(error, "No se pudo crear el lote")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferir todos los documentos</DialogTitle>
          <DialogDescription>
            Se incluirán todos los documentos de {owner.name || owner.email}.
            Los documentos bloqueados se omitirán y se mostrarán en el resumen.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm">
              <p>
                <strong>{result.summary.created}</strong> documento(s)
                incluidos en el lote.
              </p>
              <p className="text-muted-foreground">
                {result.summary.skipped} documento(s) omitidos de{" "}
                {result.summary.total}.
              </p>
            </div>

            {result.skipped.length > 0 && (
              <div className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
                {result.skipped.map((item) => (
                  <div key={`${item.documentId}-${item.reason}`} className="text-sm">
                    <span className="font-medium">Documento {item.documentId}:</span>{" "}
                    <span className="text-muted-foreground">{item.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`bulk-transfer-recipient-${owner.id}`}>
                Usuario destinatario
              </Label>
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger id={`bulk-transfer-recipient-${owner.id}`}>
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
              <Label htmlFor={`bulk-transfer-comment-${owner.id}`}>
                Motivo o comentario
              </Label>
              <Textarea
                id={`bulk-transfer-comment-${owner.id}`}
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
                onClick={() => mutation.mutate()}
                disabled={!toUserId || mutation.isPending}
              >
                {mutation.isPending ? "Enviando..." : "Transferir todos"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
