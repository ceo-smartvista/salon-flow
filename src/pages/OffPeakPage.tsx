import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Plus, Percent, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function OffPeakPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", discount_pct: "15", day_of_week: "2", start_hour: "14", end_hour: "17" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: offers } = useQuery({
    queryKey: ["offpeak-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("offpeak_offers").select("*").order("day_of_week");
      return data ?? [];
    },
  });

  const addOffer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("offpeak_offers").insert({
        name: form.name,
        discount_pct: Number(form.discount_pct),
        day_of_week: Number(form.day_of_week),
        start_hour: Number(form.start_hour),
        end_hour: Number(form.end_hour),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offpeak-offers"] }); setOpen(false); toast({ title: "Offer created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleOffer = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("offpeak_offers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offpeak-offers"] }),
  });

  const formatHour = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? "PM" : "AM"}`;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Off-Peak Scheduler</h1>
          <p className="text-muted-foreground mt-1">Auto-fill slow hours with smart discounts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />New Offer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Off-Peak Offer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Offer name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Discount %</label>
                  <Input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Day</label>
                  <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
                    {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Hour</label>
                  <Input type="number" min="9" max="19" value={form.start_hour} onChange={(e) => setForm({ ...form, start_hour: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">End Hour</label>
                  <Input type="number" min="10" max="20" value={form.end_hour} onChange={(e) => setForm({ ...form, end_hour: e.target.value })} />
                </div>
              </div>
              <Button onClick={() => addOffer.mutate()} disabled={!form.name || addOffer.isPending} className="w-full">Create Offer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium">How it works</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Create time-based discount offers for slow periods. When enabled with auto-notify, 
          loyal clients will receive messages with the discount to fill empty slots during off-peak hours.
        </p>
      </div>

      {offers?.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No off-peak offers yet. Create one above.</div>
      ) : (
        <div className="space-y-3">
          {offers?.map((offer) => (
            <div key={offer.id} className={`bg-card rounded-xl border p-5 flex items-center gap-4 transition-opacity ${offer.active ? "" : "opacity-50"}`}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Percent className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{offer.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {dayNames[offer.day_of_week]} · {formatHour(offer.start_hour)} – {formatHour(offer.end_hour)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold text-primary">{offer.discount_pct}% off</span>
              </div>
              <Switch
                checked={offer.active}
                onCheckedChange={(active) => toggleOffer.mutate({ id: offer.id, active })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
