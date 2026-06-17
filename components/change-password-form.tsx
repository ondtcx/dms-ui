"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/lib/services/auth.service";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const [success, setSuccess] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña cambiada exitosamente");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Error al cambiar la contraseña";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    setSuccess(false);

    if (!currentPassword) {
      setValidationError("La contraseña actual es requerida");
      return;
    }

    if (newPassword.length < 8) {
      setValidationError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword === currentPassword) {
      setValidationError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden");
      return;
    }

    changePasswordMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Cambiar contraseña
        </CardTitle>
        <CardDescription>
          Actualiza tu contraseña de acceso al sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              required
              autoComplete="new-password"
            />
          </div>

          {validationError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Contraseña cambiada exitosamente</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Cambiar contraseña"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
