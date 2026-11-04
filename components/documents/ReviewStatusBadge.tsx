import { Badge } from "@/components/ui/badge";
import type { DocumentReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<DocumentReviewStatus, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Devuelto",
  APPROVED: "Aprobado",
  ARCHIVED: "Archivado",
};

export function ReviewStatusBadge({
  status,
  className,
}: {
  status: DocumentReviewStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={status === "APPROVED" ? "secondary" : "outline"}
      className={cn(
        status === "CHANGES_REQUESTED" &&
          "border-amber-300 bg-amber-50 text-amber-800",
        className,
      )}
    >
      {LABELS[status]}
    </Badge>
  );
}
