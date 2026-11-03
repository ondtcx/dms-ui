"use client";

import WorkflowAdministration from "@/components/workflows/WorkflowAdministration";
import ProtectedRoute from "@/guards/ProtectedRoute";
import { WORKFLOW_CONFIGURABLE_ENABLED } from "@/lib/config/features";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkflowsPage() {
  if (!WORKFLOW_CONFIGURABLE_ENABLED) {
    return (
      <ProtectedRoute requiredPermission="workflow.templates.manage">
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Flujos de trabajo deshabilitados</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              El workflow configurable está deshabilitado. Los documentos usan
              revisión manual y los flujos existentes quedan como historial.
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }
  return (
    <ProtectedRoute requiredPermission="workflow.templates.manage">
      <WorkflowAdministration />
    </ProtectedRoute>
  );
}
