"use client";

import Link from "next/link";
import { Lock, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FrozenRoutePageProps {
  moduleName: string;
  description?: string;
}

export function FrozenRoutePage({
  moduleName,
  description = "Este módulo quedó fuera del alcance del piloto de tesis y no forma parte del flujo principal de secretaría.",
}: FrozenRoutePageProps) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6 py-10">
      <Card className="w-full border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Módulo congelado para el piloto</CardTitle>
          <CardDescription>
            <span className="font-medium text-foreground">{moduleName}</span>
            {" · "}
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Para la tesis, el sistema se concentrará en registro documental, búsqueda,
            consulta, ubicación física y trazabilidad básica.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="default">
              <Link href="/dashboard/documents">
                <FileText className="mr-2 h-4 w-4" />
                Ir a documentos
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
