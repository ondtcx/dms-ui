import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { workflowsService } from "@/lib/services/workflows.service";
export function usePendingApprovalsCount(): number {
  const { canAccessRoute } = usePermissions();
  const canApprove = canAccessRoute("/dashboard/workflows");

  const { data } = useQuery({
    queryKey: ["workflows", "pending"],
    queryFn: () => workflowsService.getPendingApprovals(),
    enabled: canApprove,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
  });

  return canApprove ? (data?.length ?? 0) : 0;
}
