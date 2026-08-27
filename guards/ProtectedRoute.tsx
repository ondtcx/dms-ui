// src/guards/ProtectedRoute.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/lib/types";
import { usePermissions } from "@/hooks/use-permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  requiredPermission?: string;
  requiredPermissions?: string[];
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      // Verificar rol requerido
      if (requiredRole && user?.role !== requiredRole) {
        router.push("/errors/unauthorized");
        return;
      }

      // Verificar múltiples roles permitidos
      if (requiredRoles && !requiredRoles.includes(user?.role as UserRole)) {
        router.push("/errors/unauthorized");
        return;
      }
      if (requiredPermission && !hasPermission(requiredPermission)) {
        router.push("/errors/unauthorized");
      }
      if (requiredPermissions && !requiredPermissions.some(hasPermission)) {
        router.push("/errors/unauthorized");
      }
    }
  }, [user, loading, isAuthenticated, requiredRole, requiredRoles, requiredPermission, requiredPermissions, hasPermission, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  if (requiredRoles && !requiredRoles.includes(user?.role as UserRole)) {
    return null;
  }
  if (requiredPermission && !hasPermission(requiredPermission)) return null;
  if (requiredPermissions && !requiredPermissions.some(hasPermission)) return null;

  return <>{children}</>;
}
