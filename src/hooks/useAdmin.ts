import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/lib/admin';

export function useAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-role', user?.id],
    queryFn: checkIsAdmin,
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
