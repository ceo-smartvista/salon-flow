import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type LicenseStatus = "active" | "grace" | "blocked" | "no_tenant" | "loading";

export function useLicenseCheck() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["license-check", user?.id],
    queryFn: async (): Promise<{ status: LicenseStatus; daysLeft?: number; tenantName?: string }> => {
      if (!user) return { status: "no_tenant" };

      // Check if user is super_admin — they bypass license checks
      const { data: isSuper } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "super_admin",
      });
      if (isSuper) return { status: "active" };

      // Find tenant for this user
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("owner_user_id", user.id)
        .single();

      if (!tenant) return { status: "no_tenant" };

      const now = new Date();
      const licenseEnd = new Date(tenant.license_end);
      const graceEnd = new Date(licenseEnd.getTime() + tenant.grace_days * 86400000);

      if (now <= licenseEnd) {
        return { status: "active", tenantName: tenant.name };
      } else if (now <= graceEnd) {
        const daysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / 86400000);
        return { status: "grace", daysLeft, tenantName: tenant.name };
      } else {
        return { status: "blocked", tenantName: tenant.name };
      }
    },
    enabled: !!user,
    refetchInterval: 60000, // recheck every minute
  });

  return {
    status: isLoading ? "loading" as LicenseStatus : (data?.status ?? "loading"),
    daysLeft: data?.daysLeft,
    tenantName: data?.tenantName,
    isLoading,
  };
}
