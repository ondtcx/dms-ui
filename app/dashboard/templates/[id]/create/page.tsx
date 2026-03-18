"use client";

import { useQuery } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TemplateDocumentForm } from "@/components/templates/TemplateDocumentForm";

export default function CreateDocumentFromTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = parseInt(params.id as string);

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => templatesService.getOne(templateId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg font-medium">Plantilla no encontrada</p>
        <Button onClick={() => router.push("/dashboard/templates")} className="mt-4">
          Volver a Plantillas
        </Button>
      </div>
    );
  }

  return (
    <TemplateDocumentForm
      mode="create"
      template={template}
      onSuccess={() => router.push("/dashboard/documents")}
    />
  );
}
