import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MembershipsPage() {
  const [openPlan, setOpenPlan] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: memberships } = useQuery({
    queryKey: ["memberships"],
    queryFn: async () => {
      const { data } = await supabase.from("memberships").select("*").order("price");
      return data ?? [];
    },
  });

  const { data: clientMemberships } = useQuery({
    queryKey: ["client-memberships"],
    queryFn: async () => {
      const { data } = await supabase.from("client_memberships").select("*, clients(name), memberships(name, usage_limit)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["membership-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });

  const [planForm, setPlanForm] = useState({ name: "", description: "", price: "2999", billing_cycle: "monthly", usage_limit: "" });
  const [assignForm, setAssignForm] = useState({ client_id: "", membership_id: "" });

  const addPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("memberships").insert({
        name: planForm.name, description: planForm.description || null,
        price: Number(planForm.price), billing_cycle: planForm.billing_cycle,
        usage_limit: planForm.usage_limit ? Number(planForm.usage_limit) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memberships"] }); setOpenPlan(false); toast({ title: "Plan created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignMembership = useMutation({
    mutationFn: async () => {
      const membership = memberships?.find((m) => m.id === assignForm.membership_id);
      const expires = new Date();
      if (membership?.billing_cycle === "monthly") expires.setMonth(expires.getMonth() + 1);
      else expires.setFullYear(expires.getFullYear() + 1);

      const { error } = await supabase.from("client_memberships").insert({
        client_id: assignForm.client_id,
        membership_id: assignForm.membership_id,
        expires_at: expires.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-memberships"] }); setOpenAssign(false); toast({ title: "Membership assigned" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">VIP Memberships</h1>
        <p className="text-muted-foreground mt-1">Subscription packages and client wallets.</p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans" className="gap-1.5"><Crown className="w-4 h-4" />Plans</TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5"><Users className="w-4 h-4" />Members</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={openPlan} onOpenChange={setOpenPlan}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Create Plan</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Membership Plan</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Plan name *" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                  <Input placeholder="Description" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Price (₹)" type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
                    <select value={planForm.billing_cycle} onChange={(e) => setPlanForm({ ...planForm, billing_cycle: e.target.value })} className="h-9 px-3 rounded-lg border bg-background text-sm">
                      <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <Input placeholder="Usage limit (empty = unlimited)" type="number" value={planForm.usage_limit} onChange={(e) => setPlanForm({ ...planForm, usage_limit: e.target.value })} />
                  <Button onClick={() => addPlan.mutate()} disabled={!planForm.name || addPlan.isPending} className="w-full">Create Plan</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {memberships?.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No membership plans yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberships?.map((plan) => (
                <div key={plan.id} className="bg-card rounded-xl border p-6">
                  <Crown className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                  {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">₹{plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm">/{plan.billing_cycle === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  {plan.usage_limit && <p className="text-xs text-muted-foreground mt-2">{plan.usage_limit} uses included</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={openAssign} onOpenChange={setOpenAssign}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Assign Membership</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign Membership</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <select value={assignForm.client_id} onChange={(e) => setAssignForm({ ...assignForm, client_id: e.target.value })} className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
                    <option value="">Select client *</option>
                    {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={assignForm.membership_id} onChange={(e) => setAssignForm({ ...assignForm, membership_id: e.target.value })} className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
                    <option value="">Select plan *</option>
                    {memberships?.map((m) => <option key={m.id} value={m.id}>{m.name} — ₹{m.price}/{m.billing_cycle}</option>)}
                  </select>
                  <Button onClick={() => assignMembership.mutate()} disabled={!assignForm.client_id || !assignForm.membership_id || assignMembership.isPending} className="w-full">
                    Assign
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {clientMemberships?.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No active memberships. Assign one above.</div>
          ) : (
            <div className="bg-card rounded-xl border divide-y">
              {clientMemberships?.map((cm) => (
                <div key={cm.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium">{(cm as any).clients?.name}</p>
                    <p className="text-xs text-muted-foreground">{(cm as any).memberships?.name} · {cm.usage_count}/{(cm as any).memberships?.usage_limit ?? "∞"} uses</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cm.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {cm.status}
                    </span>
                    {cm.expires_at && <p className="text-xs text-muted-foreground mt-1">Expires {new Date(cm.expires_at).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
