// src/hooks/usePermissions.ts
import { useAuth } from "@/lib/contexts/AuthContext";
import { UserRole } from "@/lib/types";

export function usePermissions() {
  const { user } = useAuth();

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role as UserRole) : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === UserRole.ADMIN;
  };

  const isModerator = (): boolean => {
    return user?.role === UserRole.MODERATOR;
  };

  const isUser = (): boolean => {
    return user?.role === UserRole.USER;
  };

  const canAccessRoute = (route: string): boolean => {
    // Define qué rutas necesitan qué roles
    const routePermissions: { [key: string]: UserRole[] } = {
      "/dashboard/users": [UserRole.ADMIN],
      "/dashboard/settings": [UserRole.ADMIN],
      "/dashboard/moderation": [UserRole.ADMIN, UserRole.MODERATOR],
    };

    const requiredRoles = routePermissions[route];

    if (!requiredRoles) {
      // Si la ruta no está en el objeto, es accesible para todos
      return true;
    }

    return hasAnyRole(requiredRoles);
  };

  return {
    user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isUser,
    canAccessRoute,
  };
}
