"use client";

import WorkflowAdministration from "@/components/workflows/WorkflowAdministration";
import ProtectedRoute from "@/guards/ProtectedRoute";

export default function WorkflowsPage() {
  return (
    <ProtectedRoute requiredPermission="workflow.templates.manage">
      <WorkflowAdministration />
    </ProtectedRoute>
  );
}
