import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, CheckCircle, AlertTriangle, DollarSign,
  Users, TrendingUp, Activity,
} from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

export default function OverviewTab() {
  const { data: tenants = [] } = useQuery({
    queryKey: ["sa-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["sa-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_payments").select("*, tenants(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["sa-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["sa-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_offers").select("*");
      return data ?? [];
    },
  });

  const now = new Date();
  const activeTenants = tenants.filter(t => {
    if (t.status === "blocked") return false;
    return new Date(t.license_end) >= now;
  });
  const overdueTenants = tenants.filter(t => {
    if (t.status === "blocked") return true;
    const licenseEnd = new Date(t.license_end);
    return licenseEnd < now;
  });
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);

  // Monthly revenue chart data (last 6 months)
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i);
    const monthStart = startOfMonth(month);
    const nextMonthStart = startOfMonth(subMonths(now, 4 - i));
    const monthPayments = i < 5
      ? payments.filter(p => new Date(p.payment_date) >= monthStart && new Date(p.payment_date) < nextMonthStart)
      : payments.filter(p => new Date(p.payment_date) >= monthStart);
    return {
      month: format(month, "MMM yy"),
      revenue: monthPayments.reduce((s, p) => s + (p.amount || 0), 0) / 100,
    };
  });

  // Tenant status distribution
  const statusData = [
    { name: "Active", value: activeTenants.length, color: "hsl(var(--primary))" },
    { name: "Overdue", value: overdueTenants.length, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  // Tenant growth (cumulative by month)
  const tenantGrowth = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i);
    const monthEnd = startOfMonth(subMonths(now, 4 - i));
    const count = i < 5
      ? tenants.filter(t => new Date(t.created_at) < monthEnd).length
      : tenants.length;
    return { month: format(month, "MMM yy"), tenants: count };
  });

  const stats = [
    { label: "Total Tenants", value: tenants.length, icon: Building2, color: "text-primary" },
    { label: "Active Licenses", value: activeTenants.length, icon: CheckCircle, color: "text-green-500" },
    { label: "Overdue", value: overdueTenants.length, icon: AlertTriangle, color: "text-yellow-500" },
    { label: "Total Revenue", value: `₹${(totalRevenue / 100).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Registered Users", value: users.length, icon: Users, color: "text-blue-500" },
    { label: "Active Offers", value: offers.filter(o => o.active).length, icon: TrendingUp, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Monthly Revenue (₹)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tenant Growth */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Tenant Growth
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tenantGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="tenants" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Payments</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{p.tenants?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.payment_date), "dd MMM yyyy")}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">₹{((p.amount || 0) / 100).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
