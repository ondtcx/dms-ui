"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { useAuth } from "@/lib/contexts/AuthContext";
import { User, UserRole } from "@/lib/types";
import {
  AuditView,
  resolveAuditState,
} from "@/components/documents/DocumentAuditView";

const AUDIT_PAGE_LIMIT = 20;

const AUDIT_ACCESS_ROLES = new Set<string>([
  UserRole.ADMIN,
  UserRole.RECTOR,
]);

/**
 * Mirrors the backend `RolesGuard`, which authorizes against the effective
 * roles (`authorization.roles`) rather than only the primary role.
 */
function hasAuditAccess(
  user: Pick<User, "role" | "roles"> | null | undefined,
): boolean {
  if (!user) return false;
  const effectiveRoles = [user.role, ...(user.roles ?? [])];
  return effectiveRoles.some((role) => AUDIT_ACCESS_ROLES.has(role));
}

export default function DocumentAuditPage() {
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);

  const documentId = Number(params.id);
  const validDocument = Number.isFinite(documentId) && documentId > 0;
  const enabled = !authLoading && !!user?.id && validDocument;

  const documentQuery = useQuery({
    queryKey: ["document", documentId, user?.id],
    queryFn: () => documentsService.getOne(documentId),
    enabled,
  });

  const authorized = !!user && !!documentQuery.data && documentQuery.data.id === documentId &&
    (documentQuery.data.uploadedById === user.id || hasAuditAccess(user));

  const auditQuery = useQuery({
    queryKey: ["document-audit", documentId, user?.id, page, AUDIT_PAGE_LIMIT],
    queryFn: () =>
      documentsService.getAudit(documentId, {
        page,
        limit: AUDIT_PAGE_LIMIT,
      }),
    enabled: enabled && authorized && !documentQuery.isFetching,
    placeholderData: (previousData) => previousData,
  });

  const events = auditQuery.data?.data ?? [];
  const state = authLoading || (enabled && (documentQuery.isPending || documentQuery.isFetching))
    ? "loading"
    : !validDocument ? "invalid" : resolveAuditState({
        authorized,
        loading: auditQuery.isLoading || auditQuery.isPlaceholderData,
        documentValid: validDocument,
        error: auditQuery.error,
        eventCount: events.length,
      });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Registro de actividad</h1>
        {documentQuery.data?.name ? (
          <p className="text-sm text-muted-foreground">
            {documentQuery.data.name}
          </p>
        ) : null}
      </header>
      <AuditView
        state={state}
        events={events}
        page={auditQuery.data?.page ?? page}
        totalPages={auditQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </main>
  );
}
