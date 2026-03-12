"use client";

import { Archive, FileText, Calendar, User, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ArchivePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-8 w-8" />
          Archivo
        </h1>
        <p className="text-muted-foreground mt-2">
          Acceso a documentos históricos y archivo morto del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Archivo de Documentos
          </CardTitle>
          <CardDescription>
            Esta sección está en desarrollo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Archive className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Sección en Desarrollo</p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              La funcionalidad de archivo permite almacenar y acceder a documentos históricos.
              Esta característica requiere implementación en el backend.
            </p>
            <Badge variant="outline" className="mt-4">
              Próximamente
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Características Planificadas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Historial de versiones de documentos</span>
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Documentos por período académico</span>
            </li>
            <li className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Documentos por docente o departamento</span>
            </li>
            <li className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span>Exportación de archivos completos</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
