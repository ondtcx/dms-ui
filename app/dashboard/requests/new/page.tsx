"use client";

import { RequestWizard } from "@/components/requests/RequestWizard";

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva Solicitud</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Completa los pasos para enviar tu solicitud.
        </p>
      </div>
      <RequestWizard />
    </div>
  );
}
