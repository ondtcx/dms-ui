import { Suspense } from "react";
import { DocumentsPageContent } from "../DocumentsPageContent";

/**
 * URL-only workbench variant. Do not link this route from navigation, menus,
 * or the v1 documents page.
 */
export default function DocumentsWorkbenchV2Page() {
  return (
    <Suspense fallback={<div className="p-8">Cargando documentos...</div>}>
      <DocumentsPageContent variant="v2" />
    </Suspense>
  );
}
