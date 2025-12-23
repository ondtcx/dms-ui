// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { AdminOnly } from "@/guards/RoleGuard";
import Link from "next/link";
import {
  FileText,
  Users,
  Settings,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// Shadcn imports
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardHomePage() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => documentsService.getStats(),
  });

  const getRoleBadgeVariant = (
    role: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "default";
      default:
        return "secondary";
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "¡Buenos días";
    if (hour < 19) return "¡Buenas tardes";
    return "¡Buenas noches";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Bienvenida */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">
            {getGreeting()}, {user?.name}! 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-lg">
            Bienvenido a tu panel de gestión de documentos
          </p>
          <Badge variant={getRoleBadgeVariant(user?.role || "")}>
            {user?.role?.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Panel Admin */}
      <AdminOnly>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Panel de Administrador
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
                  Tienes acceso completo a todas las funcionalidades del
                  sistema.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="default" size="sm">
                    <Link href="/dashboard/users">
                      <Users className="mr-2 h-4 w-4" />
                      Gestionar Usuarios
                    </Link>
                  </Button>
                  <Button asChild variant="default" size="sm">
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Configuración
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminOnly>

      {/* Estadísticas */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Estadísticas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documentos
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalDocuments || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Documentos almacenados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Espacio Usado
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalSizeMB || "0.00"} MB
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Espacio de almacenamiento
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Acceso rápido */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          Acceso Rápido
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/documents">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Documentos</h3>
                      <p className="text-sm text-muted-foreground">
                        Ver y gestionar documentos
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <AdminOnly>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/dashboard/users">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                        <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Usuarios</h3>
                        <p className="text-sm text-muted-foreground">
                          Administrar usuarios
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          </AdminOnly>
        </div>
      </div>

      {/* Mensaje motivacional */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-full">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">¿Listo para comenzar?</h3>
              <p className="text-sm text-muted-foreground">
                Sube tu primer documento o explora las funcionalidades del
                sistema
              </p>
            </div>
            <Button asChild className="ml-auto" variant="default">
              <Link href="/dashboard/documents">
                Ir a Documentos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
