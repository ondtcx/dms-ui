"use client";

import ProtectedRoute from "@/guards/ProtectedRoute";
import { UserRole } from "@/lib/types";
import { AcademicYearsManager } from "@/components/structure/AcademicYearsManager";
import { GraduationCap } from "lucide-react";

function AcademicYearsContent() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Años Lectivos</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona los ciclos académicos de la institución
        </p>
      </div>
      <AcademicYearsManager />
    </div>
  );
}

export default function AcademicYearsPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.DIRECTOR]}>
      <AcademicYearsContent />
    </ProtectedRoute>
  );
}
