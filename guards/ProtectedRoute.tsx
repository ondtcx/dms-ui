// src/guards/ProtectedRoute.tsx
"use client";

import { getUnauthorizedFallbackPath } from "@/lib/auth/access";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  routeKey: string;
  fallback?: React.ReactNode;
}

export function AuthorizationBoundary({
  children,
  routeKey,
  fallback = null,
}: ProtectedRouteProps) {
  const { loading, isAuthenticated } = useAuth();
  const { canAccessRoute } = usePermissions();
  const router = useRouter();
  const isAuthorized = canAccessRoute(routeKey);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      if (!isAuthorized) {
        router.push(getUnauthorizedFallbackPath());
        return;
      }
    }
  }, [isAuthorized, loading, isAuthenticated, router]);

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

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default AuthorizationBoundary;
