import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Shield, Globe, Bell, Database, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminSettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Platform stats
  const { data: stats } = useQuery({
    queryKey: ["sa-platform-stats"],
    queryFn: async () => {
      const [tenants, users, offers, payments] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("platform_offers").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("tenant_payments").select("amount"),
      ]);
      const totalRevenue = (payments.data ?? []).reduce((s, p) => s + p.amount, 0);
      return {
        tenants: tenants.count ?? 0,
        users: users.count ?? 0,
        activeOffers: offers.count ?? 0,
        totalRevenue,
      };
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Platform Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tenants", value: stats?.tenants ?? 0, icon: Database },
          { label: "Total Users", value: stats?.users ?? 0, icon: Shield },
          { label: "Active Offers", value: stats?.activeOffers ?? 0, icon: Globe },
          { label: "Total Revenue", value: `₹${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: Bell },
        ].map((card) => (
          <div key={card.label} className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Platform Configuration */}
      <div className="bg-card rounded-xl border p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Platform Configuration</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Platform Name</label>
            <Input defaultValue="SalonSync" disabled />
            <p className="text-xs text-muted-foreground mt-1">Contact support to change</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Support Email</label>
            <Input defaultValue="support@salonsync.com" disabled />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Default License Duration</label>
            <Input defaultValue="30 days" disabled />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Default Grace Period</label>
            <Input defaultValue="7 days" disabled />
          </div>
        </div>
      </div>

      {/* Security & Access */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Security & Access</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "Require Email Verification", desc: "New users must verify email before accessing the platform", checked: true },
            { label: "Allow Self-Registration", desc: "Users can sign up without an invitation", checked: true },
            { label: "Two-Factor Authentication", desc: "Require 2FA for admin and super admin accounts", checked: false },
            { label: "Session Timeout", desc: "Auto logout after 24 hours of inactivity", checked: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.checked} />
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Notifications</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "License Expiry Alerts", desc: "Email tenants 7 days before license expires", checked: true },
            { label: "Payment Receipts", desc: "Auto-send receipts after payment recording", checked: true },
            { label: "New User Signup Alerts", desc: "Notify super admins when a new user signs up", checked: false },
            { label: "Weekly Platform Report", desc: "Send weekly analytics digest to super admins", checked: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.checked} />
            </div>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Appearance & Branding</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary border" />
              <Input defaultValue="#7c3aed" className="flex-1" disabled />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Default Theme</label>
            <select className="w-full h-9 px-3 rounded-lg border bg-background text-sm" defaultValue="system">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl border border-destructive/30 p-6 space-y-4">
        <h3 className="font-display font-bold text-lg text-destructive">Danger Zone</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Temporarily disable the platform for all tenants</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <p className="text-sm font-medium">Purge Inactive Tenants</p>
              <p className="text-xs text-muted-foreground">Remove tenants with expired licenses older than 90 days</p>
            </div>
            <Button variant="destructive" size="sm">Purge</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
