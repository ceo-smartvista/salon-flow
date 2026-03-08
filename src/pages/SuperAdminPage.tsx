import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addMonths } from "date-fns";
import {
  Shield, Plus, Users, CreditCard, AlertTriangle,
  CheckCircle, XCircle, Clock, Trash2, DollarSign, Building2,
} from "lucide-react";

export default function SuperAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Form state
  const [tenantForm, setTenantForm] = useState({
    name: "", owner_email: "", license_days: 30, grace_days: 7, notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0, months: 1, notes: "",
  });

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["super-admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["super-admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_payments")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createTenant = useMutation({
    mutationFn: async () => {
      // Look up user by email from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("display_name", tenantForm.owner_email)
        .maybeSingle();

      // We'll store the email-based lookup; owner_user_id can be set later if user exists
      const { error } = await supabase.from("tenants").insert({
        name: tenantForm.name,
        owner_email: tenantForm.owner_email,
        owner_user_id: profile?.user_id ?? "00000000-0000-0000-0000-000000000000",
        license_end: addDays(new Date(), tenantForm.license_days).toISOString(),
        grace_days: tenantForm.grace_days,
        notes: tenantForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      setAddTenantOpen(false);
      setTenantForm({ name: "", owner_email: "", license_days: 30, grace_days: 7, notes: "" });
      toast({ title: "Tenant created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selectedTenantId) throw new Error("No tenant selected");
      const tenant = tenants.find(t => t.id === selectedTenantId);
      if (!tenant) throw new Error("Tenant not found");

      const periodStart = new Date(tenant.license_end) > new Date() ? new Date(tenant.license_end) : new Date();
      const periodEnd = addMonths(periodStart, paymentForm.months);

      // Record payment
      const { error: payError } = await supabase.from("tenant_payments").insert({
        tenant_id: selectedTenantId,
        amount: paymentForm.amount * 100, // store in paise/cents
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        notes: paymentForm.notes || null,
      });
      if (payError) throw payError;

      // Extend license
      const { error: upError } = await supabase
        .from("tenants")
        .update({ license_end: periodEnd.toISOString(), status: "active" })
        .eq("id", selectedTenantId);
      if (upError) throw upError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-payments"] });
      setAddPaymentOpen(false);
      setPaymentForm({ amount: 0, months: 1, notes: "" });
      toast({ title: "Payment recorded & license extended" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const blockTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from("tenants")
        .update({ status: "blocked", license_end: new Date().toISOString() })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      toast({ title: "Tenant access blocked" });
    },
  });

  const reactivateTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from("tenants")
        .update({ status: "active", license_end: addMonths(new Date(), 1).toISOString() })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      toast({ title: "Tenant reactivated with 1 month license" });
    },
  });

  const deleteTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      toast({ title: "Tenant deleted" });
    },
  });

  const getTenantStatus = (tenant: any) => {
    const now = new Date();
    const licenseEnd = new Date(tenant.license_end);
    const graceEnd = new Date(licenseEnd.getTime() + tenant.grace_days * 86400000);

    if (tenant.status === "blocked") return { label: "Blocked", variant: "destructive" as const, icon: XCircle };
    if (now <= licenseEnd) return { label: "Active", variant: "default" as const, icon: CheckCircle };
    if (now <= graceEnd) {
      const daysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / 86400000);
      return { label: `Grace (${daysLeft}d)`, variant: "secondary" as const, icon: Clock };
    }
    return { label: "Expired", variant: "destructive" as const, icon: AlertTriangle };
  };

  const activeTenants = tenants.filter(t => {
    const s = getTenantStatus(t);
    return s.label === "Active";
  });
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Super Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">Manage tenants, licenses, and payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{tenants.length}</p>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{activeTenants.length}</p>
                <p className="text-sm text-muted-foreground">Active Licenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {tenants.filter(t => getTenantStatus(t).label.includes("Grace") || getTenantStatus(t).label === "Expired").length}
                </p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">₹{(totalRevenue / 100).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">
            <Users className="w-4 h-4 mr-2" /> Tenants
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-2" /> Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={addTenantOpen} onOpenChange={setAddTenantOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Add Tenant</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Tenant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Salon Name</Label>
                    <Input value={tenantForm.name} onChange={e => setTenantForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Glamour Studio" />
                  </div>
                  <div>
                    <Label>Owner Email</Label>
                    <Input value={tenantForm.owner_email} onChange={e => setTenantForm(f => ({ ...f, owner_email: e.target.value }))} placeholder="owner@example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>License Duration (days)</Label>
                      <Input type="number" value={tenantForm.license_days} onChange={e => setTenantForm(f => ({ ...f, license_days: parseInt(e.target.value) || 30 }))} />
                    </div>
                    <div>
                      <Label>Grace Period (days)</Label>
                      <Input type="number" value={tenantForm.grace_days} onChange={e => setTenantForm(f => ({ ...f, grace_days: parseInt(e.target.value) || 7 }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input value={tenantForm.notes} onChange={e => setTenantForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                  </div>
                  <Button onClick={() => createTenant.mutate()} disabled={!tenantForm.name || !tenantForm.owner_email} className="w-full">
                    Create Tenant
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salon</TableHead>
                  <TableHead>Owner Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>License Ends</TableHead>
                  <TableHead>Grace</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantsLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : tenants.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No tenants yet</TableCell></TableRow>
                ) : (
                  tenants.map(tenant => {
                    const status = getTenantStatus(tenant);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="text-muted-foreground">{tenant.owner_email}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" /> {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(tenant.license_end), "dd MMM yyyy")}</TableCell>
                        <TableCell>{tenant.grace_days}d</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTenantId(tenant.id);
                                setAddPaymentOpen(true);
                              }}
                            >
                              <DollarSign className="w-3 h-3 mr-1" /> Pay
                            </Button>
                            {status.label !== "Blocked" ? (
                              <Button size="sm" variant="destructive" onClick={() => blockTenant.mutate(tenant.id)}>
                                <XCircle className="w-3 h-3 mr-1" /> Block
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => reactivateTenant.mutate(tenant.id)}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Activate
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => deleteTenant.mutate(tenant.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All recorded payments across tenants</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No payments recorded</TableCell></TableRow>
                ) : (
                  payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{p.tenants?.name || "—"}</TableCell>
                      <TableCell className="font-semibold">₹{(p.amount / 100).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(p.period_start), "dd MMM")} → {format(new Date(p.period_end), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.notes || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              For: <strong>{tenants.find(t => t.id === selectedTenantId)?.name}</strong>
            </p>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Extend License By (months)</Label>
              <Input type="number" value={paymentForm.months} onChange={e => setPaymentForm(f => ({ ...f, months: parseInt(e.target.value) || 1 }))} min={1} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. UPI ref #12345" />
            </div>
            <Button onClick={() => recordPayment.mutate()} disabled={paymentForm.amount <= 0} className="w-full">
              Record Payment & Extend License
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
