// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token");
  const { pathname } = request.nextUrl;

  // Registro público deshabilitado: redirigir a login
  if (pathname === "/auth/register") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Rutas públicas
  const publicRoutes = [
    "/auth/login",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/landing",
  ];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Ruta raíz
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next(); // renderiza la landing page
  }

  // Si no está autenticado y trata de acceder a ruta protegida
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Si está autenticado y trata de acceder a login/register
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
