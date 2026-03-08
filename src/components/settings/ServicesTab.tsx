import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ServicesTab() {
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
