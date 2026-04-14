"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { documentsService } from "@/lib/services/documents.service";
import { batchService } from "@/lib/services/batch.service";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  documents: "Documentos",
  templates: "Plantillas",
  categories: "Categorías",
  sections: "Secciones",
  departments: "Departamentos",
  workflows: "Workflows",
  trash: "Papelera",
  archive: "Archivo",
  reports: "Reportes",
  users: "Usuarios",
  settings: "Configuración",
  calendar: "Calendario",
  batches: "Lotes",
  edit: "Editar",
  "edit-form": "Editar",
  search: "Búsqueda",
  shares: "Compartidos",
  home: "Inicio",
  create: "Crear",
  batch: "Lote",
};

function useDocumentName(docId: number | null) {
  return useQuery({
    queryKey: ["document", docId],
    queryFn: () => documentsService.getOne(docId!),
    enabled: !!docId,
    staleTime: 60_000,
  });
}

function useBatchName(batchId: string | null) {
  return useQuery({
    queryKey: ["document-batch", batchId],
    queryFn: () => batchService.getBatch(batchId!),
    enabled: !!batchId,
    staleTime: 60_000,
  });
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Detect document ID: /documents/[number]
  const docsIdx = segments.indexOf("documents");
  const rawDocId =
    docsIdx !== -1 && segments[docsIdx + 1] && !isNaN(Number(segments[docsIdx + 1]))
      ? Number(segments[docsIdx + 1])
      : null;

  // Detect batch string ID: /documents/batches/[string]
  const batchesIdx = segments.indexOf("batches");
  const rawBatchId =
    batchesIdx !== -1 && segments[batchesIdx + 1] && isNaN(Number(segments[batchesIdx + 1]))
      ? segments[batchesIdx + 1]
      : null;

  const { data: doc } = useDocumentName(rawDocId);
  const { data: batch } = useBatchName(rawBatchId);

  const resolveSegmentLabel = (seg: string, idx: number): string => {
    const isNumeric = !isNaN(Number(seg));
    const prevSeg = segments[idx - 1];

    if (isNumeric) {
      if (prevSeg === "documents") return ((doc?.versions?.[0]?.filename) ?? '') ?? "...";
      return seg;
    }

    if (prevSeg === "batches") {
      return batch?.name ?? "...";
    }

    return SEGMENT_LABELS[seg] ?? seg;
  };

  const items: { label: string; href: string }[] = [];
  let path = "";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;

    const label = seg === "dashboard" ? "Dashboard" : resolveSegmentLabel(seg, i);
    const href = path;

    items.push({ label, href });
  }

  if (items.length <= 1) {
    return <span className="text-sm font-semibold">{items[0]?.label ?? ""}</span>;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <span key={item.href} className="inline-flex items-center gap-1.5">
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-semibold">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
