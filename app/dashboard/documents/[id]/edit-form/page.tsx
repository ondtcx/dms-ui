"use client";

import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { templatesService } from "@/lib/services/templates.service";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TemplateDocumentForm } from "@/components/templates/TemplateDocumentForm";
import { useEffect } from "react";

export default function EditDocumentFormPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = parseInt(params.id as string);

  const { data: doc, isLoading: loadingDoc } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentsService.getOne(documentId),
    enabled: !!documentId && !isNaN(documentId),
  });

  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ["template", doc?.templateId],
    queryFn: () => templatesService.getOne(doc!.templateId!),
    enabled: !!doc?.templateId,
  });

  // Si el documento no tiene plantilla, redirigir al editor OnlyOffice
  useEffect(() => {
    if (doc && !doc.templateId) {
      router.replace(`/dashboard/documents/${documentId}/edit`);
    }
  }, [doc, documentId, router]);

  if (loadingDoc || loadingTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-lg font-medium">Documento no encontrado</p>
        <Button onClick={() => router.push("/dashboard/documents")}>
          Volver a Documentos
        </Button>
      </div>
    );
  }

  if (!doc.templateId || !template) {
    return null;
  }

  return (
    <TemplateDocumentForm
      mode="edit"
      template={template}
      documentId={documentId}
      initialFormData={(doc.formData as Record<string, unknown>) ?? {}}
      initialMeta={{
        filename: doc.filename,
        description: doc.description ?? "",
        categoryId: doc.categoryId ?? undefined,
        isPublic: doc.isPublic,
      }}
      onSuccess={() => router.push(`/dashboard/documents/${documentId}`)}
    />
  );
}
