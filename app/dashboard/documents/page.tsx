import { Suspense } from "react";
import { DocumentsPageContent } from "./DocumentsPageContent";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando documentos...</div>}>
      <DocumentsPageContent />
    </Suspense>
  );
}
