// src/app/unauthorized/page.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 mb-4">
            No tienes permisos para acceder a esta página.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Tu rol actual: <span className="font-semibold">{user?.role}</span>
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
