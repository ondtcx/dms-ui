"use client";

import { useAuth } from "@/lib/contexts/AuthContext";

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

export function PermissionGuard({
  children,
  permissions,
  fallback = null,
  requireAll = false,
}: PermissionGuardProps) {
  const { user } = useAuth();

  if (!user || !user.permissions) {
    return <>{fallback}</>;
  }

  const hasAccess = requireAll
    ? permissions.every((p) => user.permissions?.includes(p))
    : permissions.some((p) => user.permissions?.includes(p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Common permission components
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={["role:admin"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function ModeratorOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={["role:moderador"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function AdminOrModerator({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={["role:admin", "role:moderador"]} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
