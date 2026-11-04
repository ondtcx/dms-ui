"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Clock, Files } from "lucide-react";
import { transfersService } from "@/lib/services/transfers.service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Stat({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof Files;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <Icon
        className={cn(
          "h-4 w-4",
          highlight ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "text-sm font-semibold",
          highlight ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function TransferStats() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transfer-stats"],
    queryFn: () => transfersService.getStats(),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
        Cargando estadísticas...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-3 text-sm">
        <span className="text-muted-foreground">
          No se pudieron cargar las estadísticas de transferencias.
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center divide-x divide-border rounded-lg border border-border bg-card/50 p-1.5">
      <Stat label="enviadas" value={data?.sent ?? 0} icon={ArrowUpRight} />
      <Stat label="recibidas" value={data?.received ?? 0} icon={ArrowDownRight} />
      <Stat label="total" value={data?.total ?? 0} icon={Files} />
      <Stat
        label="pendientes"
        value={data?.pending ?? 0}
        icon={Clock}
        highlight={(data?.pending ?? 0) > 0}
      />
    </div>
  );
}
