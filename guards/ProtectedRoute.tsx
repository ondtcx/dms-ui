// src/guards/ProtectedRoute.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

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
    }
  }, [user, loading, isAuthenticated, requiredRole, requiredRoles, router]);

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

  return <>{children}</>;
}
