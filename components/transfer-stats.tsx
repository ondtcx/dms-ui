"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, Files, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { transfersService } from "@/lib/services/transfer.service";
import { Skeleton } from "@/components/ui/skeleton";

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatItem({ label, value, icon, highlight }: StatItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5",
        highlight && "bg-destructive/10",
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded",
          highlight ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="flex items-baseline gap-1.5">
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
    </div>
  );
}

function formatNumber(num: number): string {
  return num.toLocaleString("es-ES");
}

export function TransferStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["transfer-stats"],
    queryFn: () => transfersService.getStats(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/50 p-1.5">
        <Skeleton className="h-6 w-16" />
        <div className="h-4 w-px bg-border" />
        <Skeleton className="h-6 w-16" />
        <div className="h-4 w-px bg-border" />
        <Skeleton className="h-6 w-16" />
        <div className="h-4 w-px bg-border" />
        <Skeleton className="h-6 w-12" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/50 p-1.5">
      <StatItem
        label="enviados"
        value={formatNumber(stats?.sent || 0)}
        icon={<ArrowUpRight className="h-4 w-4" />}
      />
      <div className="h-4 w-px bg-border" />
      <StatItem
        label="recibidos"
        value={formatNumber(stats?.received || 0)}
        icon={<ArrowDownRight className="h-4 w-4" />}
      />
      <div className="h-4 w-px bg-border" />
      <StatItem
        label="documentos"
        value={formatNumber(stats?.total || 0)}
        icon={<Files className="h-4 w-4" />}
      />
      <div className="h-4 w-px bg-border" />
      <StatItem
        label="pendientes"
        value={formatNumber(stats?.pending || 0)}
        icon={<Clock className="h-4 w-4" />}
        highlight
      />
    </div>
  );
}
