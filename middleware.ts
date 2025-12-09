// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token");
  const userCookie = request.cookies.get("user");
  const { pathname } = request.nextUrl;

  // Obtener rol del usuario
  let userRole = null;
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      userRole = user.role;
    } catch (error) {
      console.error("Error parsing user cookie:", error);
    }
  }

  // Rutas públicas
  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
  ];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Rutas solo para ADMIN
  const adminRoutes = ["/admin", "/dashboard/users", "/dashboard/settings"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Ruta raíz
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Si no está autenticado y trata de acceder a ruta protegida
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Si está autenticado y trata de acceder a login/register
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard/home", request.url));
  }

  // Protección de rutas ADMIN
  if (isAdminRoute && userRole !== "admin") {
    return NextResponse.redirect(new URL("/errors/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
