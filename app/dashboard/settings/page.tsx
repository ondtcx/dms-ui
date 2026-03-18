// src/app/dashboard/settings/page.tsx
"use client";

import ProtectedRoute from "@/guards/ProtectedRoute";
import { UserRole } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CalendarDays, Palette, FileText, Bell, ShieldCheck } from "lucide-react";
import { InstitutionForm } from "@/components/settings/InstitutionForm";
import { SchoolYearForm } from "@/components/settings/SchoolYearForm";
import { AppearanceForm } from "@/components/settings/AppearanceForm";
import { DocumentSettingsForm } from "@/components/settings/DocumentSettingsForm";
import { NotificationsForm } from "@/components/settings/NotificationsForm";
import { SecurityForm } from "@/components/settings/SecurityForm";
import { useSettings } from "@/lib/contexts/SettingsContext";

const TABS = [
  { value: "institution", label: "Institución", icon: Building2 },
  { value: "schoolYear", label: "Ciclo Escolar", icon: CalendarDays },
  { value: "appearance", label: "Apariencia", icon: Palette },
  { value: "documents", label: "Documentos", icon: FileText },
  { value: "notifications", label: "Notificaciones", icon: Bell },
  { value: "security", label: "Seguridad", icon: ShieldCheck },
] as const;

function SettingsContent() {
  const { isLoading } = useSettings();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra los parámetros generales de la plataforma
        </p>
      </div>

      <Tabs defaultValue="institution" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full sm:w-fit">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="institution">
          <InstitutionForm />
        </TabsContent>

        <TabsContent value="schoolYear">
          <SchoolYearForm />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceForm />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentSettingsForm />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsForm />
        </TabsContent>

        <TabsContent value="security">
          <SecurityForm />
        </TabsContent>
      </Tabs>
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
