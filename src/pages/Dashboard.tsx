import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: sales } = useQuery({
    queryKey: ["dashboard-sales"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", today);
      return data ?? [];
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ["dashboard-appointments"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("appointments")
        .select("*, clients(name), staff(name), services(name)")
        .gte("start_time", today)
        .order("start_time");
      return data ?? [];
    },
  });

  const { data: staffList } = useQuery({
    queryKey: ["dashboard-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*").eq("active", true);
      return data ?? [];
    },
  });

  const todayRevenue = sales?.reduce((s, sale) => s + (sale.total || 0), 0) ?? 0;
  const todayAppointments = appointments?.length ?? 0;

  const stats = [
    { label: "Today's Revenue", value: `₹${todayRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success" },
    { label: "Appointments", value: String(todayAppointments), icon: Calendar, color: "text-primary" },
    { label: "Active Staff", value: String(staffList?.length ?? 0), icon: Users, color: "text-accent-foreground" },
    { label: "Avg. Ticket", value: sales?.length ? `₹${Math.round(todayRevenue / sales.length).toLocaleString()}` : "₹0", icon: TrendingUp, color: "text-warning" },
  ];

  const exportCSV = () => {
    if (!sales?.length) return;
    const headers = "Date,Total,Tax,Tip,Payment Method,Status\n";
    const rows = sales.map((s) =>
      `${new Date(s.created_at).toLocaleDateString()},${s.total},${s.tax},${s.tip},${s.payment_method},${s.status}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's today's overview.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
          <Download className="w-4 h-4" />
          Export Sales CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border p-5 flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <span className="text-2xl font-display font-bold">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2 bg-card rounded-xl border">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="text-lg font-display font-bold">Today's Schedule</h2>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {todayAppointments} appointments
            </span>
          </div>
          {appointments?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No appointments scheduled today. Book one from the Calendar.
            </div>
          ) : (
            <div className="divide-y">
              {appointments?.slice(0, 8).map((apt) => (
                <div key={apt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">
                    {new Date(apt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{(apt as any).clients?.name ?? "Walk-in"}</p>
                    <p className="text-xs text-muted-foreground truncate">{(apt as any).services?.name ?? "Service"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">{(apt as any).staff?.name}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    apt.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff summary */}
        <div className="bg-card rounded-xl border">
          <div className="p-5 border-b">
            <h2 className="text-lg font-display font-bold">Staff</h2>
          </div>
          {staffList?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No staff added yet. Go to Settings to add staff.
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {staffList?.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                  <span className="text-sm font-semibold">{s.base_commission_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
