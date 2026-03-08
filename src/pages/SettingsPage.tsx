import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Tab = "salon" | "services" | "staff" | "commissions" | "danger";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("salon");
  const { toast } = useToast();
  const qc = useQueryClient();

  const tabs: { id: Tab; label: string }[] = [
    { id: "salon", label: "Salon Details" },
    { id: "services", label: "Services" },
    { id: "staff", label: "Staff" },
    { id: "commissions", label: "Commissions" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your salon configuration.</p>
      </div>
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "salon" && <SalonTab />}
      {activeTab === "services" && <ServicesTab />}
      {activeTab === "staff" && <StaffTab />}
      {activeTab === "commissions" && <CommissionsTab />}
      {activeTab === "danger" && <DangerZoneTab />}
    </div>
  );
}

function SalonTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["salon-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("salon_settings").select("*").limit(1).maybeSingle();
      if (data) return data;
      // Auto-create default settings row
      const { data: created, error } = await supabase.from("salon_settings").insert({ name: "My Salon" }).select().single();
      if (error) throw error;
      return created;
    },
  });

  const [form, setForm] = useState<any>(null);

  // Sync form with fetched data
  const s = form ?? settings;

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id || !s) return;
      const { error } = await supabase.from("salon_settings").update({
        name: s.name, phone: s.phone, email: s.email,
        currency: s.currency, address: s.address,
        online_booking: s.online_booking, whatsapp_reminders: s.whatsapp_reminders,
      }).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["salon-settings"] }); toast({ title: "Settings saved!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = (field: string, value: any) => {
    setForm((prev: any) => ({ ...(prev ?? settings), [field]: value }));
  };

  if (!s) return <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="bg-card rounded-xl border p-6 space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="text-sm font-medium mb-1.5 block">Salon Name</label><Input value={s.name ?? ""} onChange={(e) => update("name", e.target.value)} /></div>
        <div><label className="text-sm font-medium mb-1.5 block">Phone</label><Input value={s.phone ?? ""} onChange={(e) => update("phone", e.target.value)} /></div>
        <div><label className="text-sm font-medium mb-1.5 block">Email</label><Input value={s.email ?? ""} onChange={(e) => update("email", e.target.value)} /></div>
        <div><label className="text-sm font-medium mb-1.5 block">Currency</label>
          <select value={s.currency ?? "INR"} onChange={(e) => update("currency", e.target.value)} className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
            <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="sm:col-span-2"><label className="text-sm font-medium mb-1.5 block">Address</label><Input value={s.address ?? ""} onChange={(e) => update("address", e.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t">
        <div><p className="text-sm font-medium">Online Booking</p><p className="text-xs text-muted-foreground">Allow clients to book via your public page</p></div>
        <Switch checked={s.online_booking} onCheckedChange={(v) => update("online_booking", v)} />
      </div>
      {s.online_booking && (
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Your public booking link:</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-primary flex-1 truncate">{window.location.origin}/book</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book`); toast({ title: "Link copied!" }); }}>Copy</Button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-medium">WhatsApp Reminders</p><p className="text-xs text-muted-foreground">Send automated booking confirmations</p></div>
        <Switch checked={s.whatsapp_reminders} onCheckedChange={(v) => update("whatsapp_reminders", v)} />
      </div>
      <Button size="sm" className="gap-1.5" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="w-4 h-4" />{save.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

function ServicesTab() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Hair", price: "800", duration: "45", commission_pct: "40", is_product: false });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: services } = useQuery({
    queryKey: ["settings-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").order("category").order("name");
      return data ?? [];
    },
  });

  const addService = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert({
        name: form.name, category: form.category,
        price: Number(form.price), duration: Number(form.duration),
        commission_pct: Number(form.commission_pct), is_product: form.is_product,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings-services"] }); qc.invalidateQueries({ queryKey: ["pos-services"] }); setOpen(false); toast({ title: "Service added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleService = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings-services"] }); qc.invalidateQueries({ queryKey: ["pos-services"] }); },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Service name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 px-3 rounded-lg border bg-background text-sm">
                  <option>Hair</option><option>Skin</option><option>Nails</option><option>Products</option>
                </select>
                <Input placeholder="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Duration (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                <Input placeholder="Commission %" type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
              </div>
              <Button onClick={() => addService.mutate()} disabled={!form.name || addService.isPending} className="w-full">Add Service</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {services?.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No services yet. Add your first one above.</div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Commission</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services?.map((svc) => (
                <tr key={svc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium">{svc.name}</p><p className="text-xs text-muted-foreground">{svc.category}</p></td>
                  <td className="px-4 py-3 text-right">₹{svc.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{svc.duration} min</td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{svc.commission_pct}%</td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={svc.active} onCheckedChange={(active) => toggleService.mutate({ id: svc.id, active })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffTab() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Stylist", base_commission_pct: "40" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: staff } = useQuery({
    queryKey: ["settings-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*").order("name");
      return data ?? [];
    },
  });

  const addStaff = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff").insert({
        name: form.name, role: form.role,
        base_commission_pct: Number(form.base_commission_pct),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings-staff"] }); setOpen(false); toast({ title: "Staff added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
                <option>Stylist</option><option>Senior Stylist</option><option>Therapist</option><option>Junior Stylist</option><option>Receptionist</option>
              </select>
              <Input placeholder="Base commission %" type="number" value={form.base_commission_pct} onChange={(e) => setForm({ ...form, base_commission_pct: e.target.value })} />
              <Button onClick={() => addStaff.mutate()} disabled={!form.name || addStaff.isPending} className="w-full">Add Staff</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {staff?.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No staff yet. Add your first team member above.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff?.map((member) => (
            <div key={member.id} className="bg-card rounded-xl border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{member.name}</h3>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Base commission</span>
                <span className="text-sm font-semibold">{member.base_commission_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommissionsTab() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "", rate_pct: "40", material_deduction: "0" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rules } = useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_rules").select("*").order("category");
      return data ?? [];
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("commission_rules").insert({
        category: form.category,
        rate_pct: Number(form.rate_pct),
        material_deduction: Number(form.material_deduction),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commission-rules"] }); setOpen(false); toast({ title: "Rule added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="bg-card rounded-xl border p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg">Commission Rules</h3>
          <p className="text-sm text-muted-foreground mt-1">Define how staff commissions are calculated per category.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Commission Rule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Rate %" type="number" value={form.rate_pct} onChange={(e) => setForm({ ...form, rate_pct: e.target.value })} />
                <Input placeholder="Material deduction (₹)" type="number" value={form.material_deduction} onChange={(e) => setForm({ ...form, material_deduction: e.target.value })} />
              </div>
              <Button onClick={() => addRule.mutate()} disabled={!form.category || addRule.isPending} className="w-full">Add Rule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules?.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No commission rules yet. Add your first one above.</div>
      ) : (
        <div className="space-y-3">
          {rules?.map((rule) => (
            <div key={rule.id} className="flex items-center gap-4 p-3 rounded-lg border">
              <span className="text-sm font-medium flex-1">{rule.category}</span>
              <div className="text-right">
                <span className="text-sm font-semibold">{rule.rate_pct}%</span>
                {rule.material_deduction > 0 && <p className="text-xs text-muted-foreground">−₹{rule.material_deduction} material cost</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Formula: (Service Price − Material Cost) × Commission % + Tips</p>
    </div>
  );
}

function DangerZoneTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const resetAll = useMutation({
    mutationFn: async () => {
      // Delete in order respecting foreign keys
      const tables = [
        "sale_items", "sales", "inventory_usage", "purchase_orders",
        "consent_forms", "portfolio", "client_memberships", "appointments",
        "offpeak_offers", "commission_rules", "memberships",
        "inventory", "services", "staff", "clients", "salon_settings",
      ];
      for (const table of tables) {
        const { error } = await supabase.from(table as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      setConfirmText("");
      toast({ title: "All data has been reset", description: "Your salon data has been cleared." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="bg-card rounded-xl border border-destructive/30 p-6 space-y-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">Reset All Data</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This will permanently delete all your salon data including clients, staff, services, sales, inventory, appointments, memberships, and settings. This action cannot be undone.
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmText(""); }}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-1.5">
            <Trash2 className="w-4 h-4" />Delete All Data
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your salon data. Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder='Type "DELETE" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <Button
            variant="destructive"
            className="w-full"
            disabled={confirmText !== "DELETE" || resetAll.isPending}
            onClick={() => resetAll.mutate()}
          >
            {resetAll.isPending ? "Deleting..." : "Permanently Delete All Data"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
