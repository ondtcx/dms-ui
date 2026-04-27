import { useQuery } from '@tanstack/react-query';
import { rolesService } from '@/lib/services/roles.service';

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
