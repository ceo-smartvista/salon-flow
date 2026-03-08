import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addMonths } from "date-fns";
import {
  Plus, CheckCircle, XCircle, Clock, AlertTriangle,
  Trash2, DollarSign,
} from "lucide-react";

export default function TenantsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState({
    name: "", owner_email: "", full_name: "", temp_password: "", license_days: 30, grace_days: 7, notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, months: 1, notes: "" });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["sa-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createTenant = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-salon-admin", {
        body: {
          salon_name: tenantForm.name,
          owner_email: tenantForm.owner_email,
          temp_password: tenantForm.temp_password,
          full_name: tenantForm.full_name || tenantForm.name,
          license_days: tenantForm.license_days,
          grace_days: tenantForm.grace_days,
          notes: tenantForm.notes || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
      setAddTenantOpen(false);
      setTenantForm({ name: "", owner_email: "", full_name: "", temp_password: "", license_days: 30, grace_days: 7, notes: "" });
      toast({ title: "Salon admin account created!", description: "The salon owner can now log in with the temporary password." });
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
      const { error: payError } = await supabase.from("tenant_payments").insert({
        tenant_id: selectedTenantId, amount: paymentForm.amount * 100,
        period_start: periodStart.toISOString(), period_end: periodEnd.toISOString(),
        notes: paymentForm.notes || null,
      });
      if (payError) throw payError;
      const { error: upError } = await supabase.from("tenants").update({ license_end: periodEnd.toISOString(), status: "active" }).eq("id", selectedTenantId);
      if (upError) throw upError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["sa-payments"] });
      setAddPaymentOpen(false);
      setPaymentForm({ amount: 0, months: 1, notes: "" });
      toast({ title: "Payment recorded & license extended" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const blockTenant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").update({ status: "blocked", license_end: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sa-tenants"] }); toast({ title: "Tenant blocked" }); },
  });

  const reactivateTenant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").update({ status: "active", license_end: addMonths(new Date(), 1).toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sa-tenants"] }); toast({ title: "Tenant reactivated" }); },
  });

  const deleteTenant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sa-tenants"] }); toast({ title: "Tenant deleted" }); },
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addTenantOpen} onOpenChange={setAddTenantOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Tenant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Tenant</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Salon Name</Label><Input value={tenantForm.name} onChange={e => setTenantForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Glamour Studio" /></div>
              <div><Label>Owner Full Name</Label><Input value={tenantForm.full_name} onChange={e => setTenantForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. John Doe" /></div>
              <div><Label>Owner Email</Label><Input value={tenantForm.owner_email} onChange={e => setTenantForm(f => ({ ...f, owner_email: e.target.value }))} placeholder="owner@example.com" /></div>
              <div><Label>Temporary Password</Label><Input type="text" value={tenantForm.temp_password} onChange={e => setTenantForm(f => ({ ...f, temp_password: e.target.value }))} placeholder="One-time temp password" /><p className="text-xs text-muted-foreground mt-1">The salon owner will be required to change this on first login.</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>License (days)</Label><Input type="number" value={tenantForm.license_days} onChange={e => setTenantForm(f => ({ ...f, license_days: parseInt(e.target.value) || 30 }))} /></div>
                <div><Label>Grace (days)</Label><Input type="number" value={tenantForm.grace_days} onChange={e => setTenantForm(f => ({ ...f, grace_days: parseInt(e.target.value) || 7 }))} /></div>
              </div>
              <div><Label>Notes</Label><Input value={tenantForm.notes} onChange={e => setTenantForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
              <Button onClick={() => createTenant.mutate()} disabled={!tenantForm.name || !tenantForm.owner_email || !tenantForm.temp_password || tenantForm.temp_password.length < 6} className="w-full">
                Create Salon Admin Account
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
            {isLoading ? (
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
                    <TableCell><Badge variant={status.variant} className="gap-1"><StatusIcon className="w-3 h-3" /> {status.label}</Badge></TableCell>
                    <TableCell>{format(new Date(tenant.license_end), "dd MMM yyyy")}</TableCell>
                    <TableCell>{tenant.grace_days}d</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedTenantId(tenant.id); setAddPaymentOpen(true); }}>
                          <DollarSign className="w-3 h-3 mr-1" /> Pay
                        </Button>
                        {status.label !== "Blocked" ? (
                          <Button size="sm" variant="destructive" onClick={() => blockTenant.mutate(tenant.id)}><XCircle className="w-3 h-3 mr-1" /> Block</Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => reactivateTenant.mutate(tenant.id)}><CheckCircle className="w-3 h-3 mr-1" /> Activate</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteTenant.mutate(tenant.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">For: <strong>{tenants.find(t => t.id === selectedTenantId)?.name}</strong></p>
            <div><Label>Amount (₹)</Label><Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Extend License (months)</Label><Input type="number" value={paymentForm.months} onChange={e => setPaymentForm(f => ({ ...f, months: parseInt(e.target.value) || 1 }))} min={1} /></div>
            <div><Label>Notes</Label><Input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. UPI ref #12345" /></div>
            <Button onClick={() => recordPayment.mutate()} disabled={paymentForm.amount <= 0} className="w-full">Record Payment & Extend License</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
