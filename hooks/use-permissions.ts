// src/hooks/usePermissions.ts
import {
  canAccessRoute as canAccessRouteByPermission,
  getRoutePolicy as getSharedRoutePolicy,
  hasAllPermissions as hasEveryPermission,
  hasAnyPermission as hasSomePermission,
  hasPermission as hasSinglePermission,
} from "@/lib/auth/access";
import { resolveLegacyRoleName } from "@/lib/auth/normalizers";
import { useAuth } from "@/lib/contexts/AuthContext";

export function usePermissions() {
  const { user } = useAuth();
  const roleName = resolveLegacyRoleName(user ?? {});
  const permissions = user?.permissions ?? [];

  const hasPermission = (permission: string): boolean => {
    return hasSinglePermission(permissions, permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return hasSomePermission(permissions, requiredPermissions);
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return hasEveryPermission(permissions, requiredPermissions);
  };

  const getRoutePolicy = (route: string) => {
    return getSharedRoutePolicy(route);
  };

  const hasRole = (role: string): boolean => {
    return roleName === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roleName ? roles.includes(roleName) : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  const isModerator = (): boolean => {
    return user?.role === "moderador";
  };

  const isUser = (): boolean => {
    return roleName === "user";
  };

  const canAccessRoute = (route: string): boolean => {
    return canAccessRouteByPermission(route, permissions);
  };

  return {
    user,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getRoutePolicy,
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isUser,
    canAccessRoute,
  };
}
