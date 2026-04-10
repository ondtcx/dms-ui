import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { workflowsService } from "@/lib/services/workflows.service";
import { UserRole } from "@/lib/types";

const APPROVER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.RECTOR,
  UserRole.VICERRECTOR,
  UserRole.COORDINADOR,
  UserRole.SECRETARIO,
  UserRole.MODERADOR,
];

export function usePendingApprovalsCount(): number {
  const { hasAnyRole } = usePermissions();
  const canApprove = hasAnyRole(APPROVER_ROLES);

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
