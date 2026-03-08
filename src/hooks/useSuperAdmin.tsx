import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin, isLoading } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "super_admin",
      });
      return !!data;
    },
    enabled: !!user,
  });

  return { isSuperAdmin: !!isSuperAdmin, isLoading };
}
