import { useState, useEffect } from "react";
import { Shield, LayoutDashboard, Building2, CreditCard, Users, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewTab from "@/components/super-admin/OverviewTab";
import TenantsTab from "@/components/super-admin/TenantsTab";
import PaymentsTab from "@/components/super-admin/PaymentsTab";
import UsersTab from "@/components/super-admin/UsersTab";
import OffersTab from "@/components/super-admin/OffersTab";

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setActiveTab(detail);
    };
    window.addEventListener("super-admin-tab", handler);
    return () => window.removeEventListener("super-admin-tab", handler);
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Super Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Platform management — tenants, payments, users, and offers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="tenants"><Building2 className="w-4 h-4 mr-1.5" /> Tenants</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1.5" /> Payments</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-1.5" /> Users</TabsTrigger>
          <TabsTrigger value="offers"><Tag className="w-4 h-4 mr-1.5" /> Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
        <TabsContent value="tenants" className="mt-6"><TenantsTab /></TabsContent>
        <TabsContent value="payments" className="mt-6"><PaymentsTab /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
        <TabsContent value="offers" className="mt-6"><OffersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
