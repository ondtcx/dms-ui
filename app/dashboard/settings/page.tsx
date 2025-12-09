// src/app/dashboard/settings/page.tsx
"use client";

import ProtectedRoute from "@/guards/ProtectedRoute";
import { UserRole } from "@/lib/types";
import Link from "next/link";

function SettingsContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">Configuración</h1>
            </div>
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600"
              >
                ← Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Configuración del Sistema
          </h2>
          <p className="text-gray-600">
            Aquí puedes configurar las opciones del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
