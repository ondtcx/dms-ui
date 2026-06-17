"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/lib/services/auth.service";
import { Suspense } from "react";
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
import { cn } from "@/lib/utils";
import Link from "next/link";
import { KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const resetMutation = useMutation({
    mutationFn: () => authService.resetPassword(token, newPassword),
    onSuccess: () => {
      setSuccess(true);
      toast.success("Contraseña restablecida exitosamente");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Error al restablecer la contraseña";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!token.trim()) {
      setValidationError("El token es requerido");
      return;
    }

    if (newPassword.length < 8) {
      setValidationError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden");
      return;
    }

    resetMutation.mutate();
  };

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle>Contraseña restablecida</CardTitle>
            <CardDescription>
              Tu contraseña ha sido actualizada correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Ir al inicio de sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-blue-100 p-3 rounded-full">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresa el token proporcionado por el administrador y tu nueva
            contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token de restablecimiento</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pega el token aquí..."
                required
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
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
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

            <Button
              type="submit"
              className="w-full"
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                "Restablecer contraseña"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <Link
          href="/auth/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </CardContent>
          </Card>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
