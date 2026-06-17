// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT in middleware:', error);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token");
  const { pathname } = request.nextUrl;

  // Obtener rol del usuario desde el JWT (Seguro)
  let userRole = null;
  if (token) {
    const decoded = decodeJwt(token.value);
    if (decoded && decoded.role) {
      userRole = decoded.role;
    }
  }

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

  // Rutas solo para ADMIN
  const adminRoutes = ["/admin", "/dashboard/users", "/dashboard/settings"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

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

  // Protección de rutas ADMIN
  if (isAdminRoute && userRole !== "admin") {
    return NextResponse.redirect(new URL("/errors/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
