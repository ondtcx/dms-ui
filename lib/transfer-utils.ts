import { TransferStatus, type TransferHistory } from "@/lib/types";

export const transferStatusConfig: Record<
  TransferStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  COMPLETED: {
    label: "Completada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CANCELED: {
    label: "Cancelada",
    className: "border-border bg-muted text-muted-foreground",
  },
};

export function formatTransferDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function transferDocumentName(transfer: {
  document: {
    name: string | null;
    versions?: { filename: string }[];
  };
}): string {
  return (
    transfer.document.name?.trim() ||
    transfer.document.versions?.[0]?.filename ||
    "Documento"
  );
}

export function transferErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message = (
    error as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;
  return Array.isArray(message) ? message.join(". ") : message || fallback;
}

export interface TransferBatchGroup {
  batchId: string;
  items: TransferHistory[];
  representative: TransferHistory;
  status: TransferStatus;
  pendingCount: number;
  totalCount: number;
}

export function groupTransfers(transfers: TransferHistory[]): {
  singles: TransferHistory[];
  batches: TransferBatchGroup[];
} {
  const singles: TransferHistory[] = [];
  const groups = new Map<string, TransferHistory[]>();

  for (const transfer of transfers) {
    if (!transfer.batchId) {
      singles.push(transfer);
      continue;
    }
    const current = groups.get(transfer.batchId) ?? [];
    current.push(transfer);
    groups.set(transfer.batchId, current);
  }

  const batches = [...groups.entries()].map(([batchId, items]) => {
    const pendingCount = items.filter((item) => item.status === "PENDING").length;
    const status: TransferStatus =
      pendingCount > 0
        ? TransferStatus.PENDING
        : items.some((item) => item.status === TransferStatus.COMPLETED)
          ? TransferStatus.COMPLETED
          : TransferStatus.CANCELED;
    return {
      batchId,
      items,
      representative: items[0],
      status,
      pendingCount,
      totalCount: items.length,
    };
  });

  return { singles, batches };
}
