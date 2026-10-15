"use client";

import ProtectedRoute from "@/guards/ProtectedRoute";
import { ChangePasswordForm } from "@/components/change-password-form";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/contexts/AuthContext";
import { UserRound, Mail, Shield } from "lucide-react";
import { formatRole } from "@/lib/utils";

function MyAccountContent() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Administra tu información personal y seguridad
        </p>
      </div>

      {/* Información del usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            Información personal
          </CardTitle>
          <CardDescription>
            Datos de tu cuenta en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Rol</p>
              <p className="text-xs text-muted-foreground">
                {formatRole(user?.role)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TwoFactorSettings />

      {/* Cambiar contraseña */}
      <ChangePasswordForm />
    </div>
  );
}

export default function MyAccountPage() {
  return (
    <ProtectedRoute>
      <MyAccountContent />
    </ProtectedRoute>
  );
}
