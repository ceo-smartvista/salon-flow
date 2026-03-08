import { useState } from "react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import SalonTab from "@/components/settings/SalonTab";
import ServicesTab from "@/components/settings/ServicesTab";
import StaffTab from "@/components/settings/StaffTab";
import CommissionsTab from "@/components/settings/CommissionsTab";
import DangerZoneTab from "@/components/settings/DangerZoneTab";
import SuperAdminSettingsTab from "@/components/settings/SuperAdminSettingsTab";

type SalonTabId = "salon" | "services" | "staff" | "commissions" | "danger";
type SuperAdminTabId = "platform" | "security" | "danger";

export default function SettingsPage() {
  const { isSuperAdmin } = useSuperAdmin();
  const [salonTab, setSalonTab] = useState<SalonTabId>("salon");

  const salonTabs: { id: SalonTabId; label: string }[] = [
    { id: "salon", label: "Salon Details" },
    { id: "services", label: "Services" },
    { id: "staff", label: "Staff" },
    { id: "commissions", label: "Commissions" },
    { id: "danger", label: "Danger Zone" },
  ];

  if (isSuperAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your platform configuration as Super Admin.</p>
        </div>
        <SuperAdminSettingsTab />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your salon configuration.</p>
      </div>
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 overflow-x-auto">
        {salonTabs.map((tab) => (
          <button key={tab.id} onClick={() => setSalonTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              salonTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>{tab.label}</button>
        ))}
      </div>

      {salonTab === "salon" && <SalonTab />}
      {salonTab === "services" && <ServicesTab />}
      {salonTab === "staff" && <StaffTab />}
      {salonTab === "commissions" && <CommissionsTab />}
      {salonTab === "danger" && <DangerZoneTab />}
    </div>
  );
}
