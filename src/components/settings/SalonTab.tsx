import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function SalonTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["salon-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("salon_settings").select("*").limit(1).maybeSingle();
      if (data) return data;
      const { data: created, error } = await supabase.from("salon_settings").insert({ name: "My Salon" }).select().single();
      if (error) throw error;
      return created;
    },
  });

  const [form, setForm] = useState<any>(null);
  const s = form ?? settings;

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id || !s) return;
      const { error } = await supabase.from("salon_settings").update({
        name: s.name, phone: s.phone, email: s.email,
        currency: s.currency, address: s.address,
        online_booking: s.online_booking, whatsapp_reminders: s.whatsapp_reminders,
        hero_image: s.hero_image,
      } as any).eq("id", settings.id);
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
      <div className="pt-2 border-t space-y-3">
        <div>
          <p className="text-sm font-medium">Hero Banner Image</p>
          <p className="text-xs text-muted-foreground">Displayed on your public booking page header</p>
        </div>
        {s.hero_image ? (
          <div className="relative rounded-lg overflow-hidden border">
            <img src={s.hero_image} alt="Hero banner" className="w-full h-40 object-cover" />
            <button onClick={() => update("hero_image", null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload banner image</span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const ext = file.name.split(".").pop();
              const path = `hero/${Date.now()}.${ext}`;
              const { error: upErr } = await supabase.storage.from("salon-photos").upload(path, file);
              if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
              const { data: urlData } = supabase.storage.from("salon-photos").getPublicUrl(path);
              update("hero_image", urlData.publicUrl);
              toast({ title: "Image uploaded!" });
            }} />
          </label>
        )}
      </div>
      <Button size="sm" className="gap-1.5" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="w-4 h-4" />{save.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
