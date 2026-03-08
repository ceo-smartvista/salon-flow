import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function StaffTab() {
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
