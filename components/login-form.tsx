// components/auth/LoginForm.tsx
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { LoginDto } from "@/lib/types";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>();

  const [loading, setLoading] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);

    try {
      const response = await login(data.email, data.password, data.code);
      if (!response.access_token) {
        setTwoFactorRequired(true);
        toast.error("Ingrese su código de autenticación");
        return;
      }
      toast.success("¡Bienvenido!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      const err = error as {
        response?: { data?: { code?: string; message?: string } };
        message?: string;
      };
      if (err.response?.data?.code === "TWO_FACTOR_REQUIRED") {
        setTwoFactorRequired(true);
        toast.error("Ingrese su código de autenticación");
      } else {
        toast.error(
          err.response?.data?.message ||
            err.message ||
            "Error al iniciar sesión"
        );
      }
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresá tu email para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="flex flex-col gap-6">
              {/* Email Field */}
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@colegio.edu"
                  disabled={loading}
                  {...register("email", {
                    required: "El correo es obligatorio",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Dirección de correo inválida",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    tabIndex={-1}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingresá tu contraseña"
                  disabled={loading}
                  {...register("password", {
                    required: "La contraseña es obligatoria",
                    minLength: {
                      value: 6,
                      message: "La contraseña debe tener al menos 6 caracteres",
                    },
                  })}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {twoFactorRequired && (
                <div className="grid gap-2">
                  <Label htmlFor="code">{useRecoveryCode ? "Código de recuperación" : "Código de autenticación"}</Label>
                  <Input id="code" inputMode="numeric" autoComplete="one-time-code" disabled={loading} {...register("code", { required: "El código es obligatorio" })} />
                  {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
                  <button type="button" className="text-left text-sm underline" onClick={() => setUseRecoveryCode(!useRecoveryCode)}>
                    {useRecoveryCode ? "Usar código de autenticación" : "Usar código de recuperación"}
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
