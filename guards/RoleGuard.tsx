// src/guards/RoleGuard.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { UserRole } from "@/lib/types";

interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  roles,
  fallback = null,
}: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role as UserRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Componentes específicos para roles comunes
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGuard roles={[UserRole.ADMIN]} fallback={fallback}>
      {children}
    </RoleGuard>
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
    <RoleGuard roles={[UserRole.MODERATOR]} fallback={fallback}>
      {children}
    </RoleGuard>
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
    <RoleGuard roles={[UserRole.ADMIN, UserRole.MODERATOR]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
