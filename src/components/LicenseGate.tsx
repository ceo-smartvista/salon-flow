import { useLicenseCheck } from "@/hooks/useLicenseCheck";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Shield, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const { status, daysLeft, tenantName, isLoading } = useLicenseCheck();
  const { isSuperAdmin } = useSuperAdmin();

  // Super admins bypass license checks
  if (isSuperAdmin) return <>{children}</>;

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No tenant record = new user, allow access (they haven't been assigned yet)
  if (status === "no_tenant" || status === "active") {
    return <>{children}</>;
  }

  if (status === "grace") {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Your license has expired. You have <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> left in your grace period. 
              Please contact your administrator to renew.
            </p>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // Blocked
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Access Suspended</h2>
          <p className="text-muted-foreground">
            Your license for <strong>{tenantName}</strong> has expired and the grace period has ended. 
            Please contact your administrator to renew your subscription.
          </p>
          <div className="pt-2">
            <Shield className="w-5 h-5 text-muted-foreground mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
