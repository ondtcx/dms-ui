"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
import { SETTINGS_SECTION_LABELS } from "@/lib/settings-sections";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Inicio",
  documents: "Documentos",
  audit: "Registro de actividad",
  directories: "Carpetas",
  new: "Nueva",
  templates: "Plantillas",
  categories: "Categorías",
  sections: "Secciones",
  workflows: "Flujos de trabajo",
  elaboracion: "Plantillas institucionales",
  pending: "Pendientes de revisión",
  transfers: "Transferencias",
  sent: "Enviadas",
  received: "Recibidas",
  "new-transfer": "Nueva transferencia",
  pendientes: "Pendientes",
  plantillas: "Plantillas",
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
  v2: "Vista de trabajo",
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
  const searchParams = useSearchParams();
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

    // `/dashboard` already means "Inicio"; repeating `home` yields "Inicio / Inicio".
    if (seg === "home" && segments[i - 1] === "dashboard") continue;

    const label = resolveSegmentLabel(seg, i);
    const href = path;

    items.push({ label, href });
  }

  const settingsSection = pathname === "/dashboard/settings"
    ? searchParams.get("section")
    : null;
  const settingsSectionLabel = settingsSection
    ? SETTINGS_SECTION_LABELS[settingsSection]
    : undefined;
  if (settingsSectionLabel) {
    items.push({
      label: settingsSectionLabel,
      href: `${pathname}?section=${settingsSection}`,
    });
  }

  if (items.length <= 1) {
    return <span className="text-sm font-semibold">{items[0]?.label ?? ""}</span>;
  }

  return (
    <Breadcrumb aria-label="Ruta de navegación">
      <BreadcrumbList>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Fragment key={item.href}>
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
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
