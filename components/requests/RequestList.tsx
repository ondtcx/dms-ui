"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { workflowsService } from "@/lib/services/workflows.service";
import { WorkflowStatus } from "@/lib/types";
import { RequestCard } from "./RequestCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Loader2, PlusCircle } from "lucide-react";

type StatusFilter = "all" | "active" | "completed" | "cancelled";

interface FilterTab {
  value: StatusFilter;
  label: string;
}

const FILTER_TABS: FilterTab[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "En curso" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
];

export function RequestList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["my-requests", statusFilter, page],
    queryFn: () =>
      workflowsService.getMyInitiatedWorkflows({
        status: statusFilter,
        page,
        limit: LIMIT,
      }),
  });

  const workflows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  function handleFilterChange(value: string) {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Mis Solicitudes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Seguimiento de tus solicitudes enviadas
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/requests/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={handleFilterChange}>
        <TabsList className="w-full sm:w-auto">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1 sm:flex-none">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState statusFilter={statusFilter} />
      ) : (
        <>
          <div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
            style={{ opacity: isFetching ? 0.6 : 1, transition: "opacity 150ms" }}
          >
            {workflows.map((workflow) => (
              <RequestCard key={workflow.id} workflow={workflow} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
                {meta && ` · ${meta.total} solicitudes`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1 || isFetching}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || isFetching}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ statusFilter }: { statusFilter: StatusFilter }) {
  const messages: Record<StatusFilter, string> = {
    all: "No tienes solicitudes todavía.",
    active: "No tienes solicitudes en curso.",
    completed: "No tienes solicitudes completadas.",
    cancelled: "No tienes solicitudes canceladas.",
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{messages[statusFilter]}</p>
        {statusFilter === "all" && (
          <p className="text-xs text-muted-foreground">
            Crea tu primera solicitud usando el botón de arriba.
          </p>
        )}
      </div>
      {statusFilter === "all" && (
        <Button asChild size="sm">
          <Link href="/dashboard/requests/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Link>
        </Button>
      )}
    </div>
  );
}
