import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CommissionsTab() {
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
