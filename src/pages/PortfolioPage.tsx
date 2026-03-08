import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Camera, FileText, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PortfolioPage() {
  const [openPortfolio, setOpenPortfolio] = useState(false);
  const [openConsent, setOpenConsent] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const { data } = await supabase.from("portfolio").select("*, clients(name), staff(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: consents } = useQuery({
    queryKey: ["consent-forms"],
    queryFn: async () => {
      const { data } = await supabase.from("consent_forms").select("*, clients(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["portfolio-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });

  const [portfolioForm, setPortfolioForm] = useState({ client_id: "", service_name: "", notes: "" });
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);

  const uploadPhoto = async (file: File) => {
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("salon-photos").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("salon-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const addPortfolio = useMutation({
    mutationFn: async () => {
      let before_photo = null, after_photo = null;
      if (beforeFile) before_photo = await uploadPhoto(beforeFile);
      if (afterFile) after_photo = await uploadPhoto(afterFile);
      const { error } = await supabase.from("portfolio").insert({
        client_id: portfolioForm.client_id,
        service_name: portfolioForm.service_name,
        before_photo, after_photo,
        notes: portfolioForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      setOpenPortfolio(false);
      setBeforeFile(null); setAfterFile(null);
      toast({ title: "Portfolio entry added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const [consentForm, setConsentForm] = useState({ client_id: "", service_name: "", allergies: "", medical: "", acknowledgment: false });

  const addConsent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("consent_forms").insert({
        client_id: consentForm.client_id,
        service_name: consentForm.service_name,
        form_data: { allergies: consentForm.allergies, medical: consentForm.medical },
        signed_at: consentForm.acknowledgment ? new Date().toISOString() : null,
        signature_data: consentForm.acknowledgment ? "digital-consent-accepted" : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consent-forms"] });
      setOpenConsent(false);
      toast({ title: "Consent form recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Portfolio & Consent</h1>
        <p className="text-muted-foreground mt-1">Before/after transformations and digital consent forms.</p>
      </div>

      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio" className="gap-1.5"><Camera className="w-4 h-4" />Portfolio</TabsTrigger>
          <TabsTrigger value="consent" className="gap-1.5"><Shield className="w-4 h-4" />Consent Forms</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={openPortfolio} onOpenChange={setOpenPortfolio}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Portfolio Entry</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <select value={portfolioForm.client_id} onChange={(e) => setPortfolioForm({ ...portfolioForm, client_id: e.target.value })} className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
                    <option value="">Select client *</option>
                    {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Input placeholder="Service name *" value={portfolioForm.service_name} onChange={(e) => setPortfolioForm({ ...portfolioForm, service_name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Before Photo</label>
                      <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)} className="text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">After Photo</label>
                      <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)} className="text-sm" />
                    </div>
                  </div>
                  <Input placeholder="Notes (optional)" value={portfolioForm.notes} onChange={(e) => setPortfolioForm({ ...portfolioForm, notes: e.target.value })} />
                  <Button onClick={() => addPortfolio.mutate()} disabled={!portfolioForm.client_id || !portfolioForm.service_name || addPortfolio.isPending} className="w-full">
                    {addPortfolio.isPending ? "Uploading..." : "Add Entry"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {portfolio?.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No portfolio entries yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {portfolio?.map((entry) => (
                <div key={entry.id} className="bg-card rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-2 h-48">
                    {entry.before_photo ? (
                      <img src={entry.before_photo} alt="Before" className="w-full h-full object-cover" />
                    ) : (
                      <div className="bg-muted flex items-center justify-center text-xs text-muted-foreground">No before</div>
                    )}
                    {entry.after_photo ? (
                      <img src={entry.after_photo} alt="After" className="w-full h-full object-cover" />
                    ) : (
                      <div className="bg-muted flex items-center justify-center text-xs text-muted-foreground">No after</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold">{(entry as any).clients?.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.service_name}</p>
                    {entry.notes && <p className="text-xs text-muted-foreground mt-1 italic">{entry.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="consent" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={openConsent} onOpenChange={setOpenConsent}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />New Consent Form</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Digital Consent Form</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <select value={consentForm.client_id} onChange={(e) => setConsentForm({ ...consentForm, client_id: e.target.value })} className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
                    <option value="">Select client *</option>
                    {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Input placeholder="Treatment name *" value={consentForm.service_name} onChange={(e) => setConsentForm({ ...consentForm, service_name: e.target.value })} />
                  <Input placeholder="Known allergies" value={consentForm.allergies} onChange={(e) => setConsentForm({ ...consentForm, allergies: e.target.value })} />
                  <Input placeholder="Medical conditions" value={consentForm.medical} onChange={(e) => setConsentForm({ ...consentForm, medical: e.target.value })} />
                  <label className="flex items-start gap-2 text-sm p-3 rounded-lg border bg-muted/50">
                    <input type="checkbox" checked={consentForm.acknowledgment} onChange={(e) => setConsentForm({ ...consentForm, acknowledgment: e.target.checked })} className="mt-0.5" />
                    <span className="text-xs">I acknowledge and consent to this treatment. I confirm the information provided is accurate and understand the risks involved.</span>
                  </label>
                  <Button onClick={() => addConsent.mutate()} disabled={!consentForm.client_id || !consentForm.service_name || !consentForm.acknowledgment || addConsent.isPending} className="w-full">
                    Record Consent
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {consents?.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No consent forms recorded yet.</div>
          ) : (
            <div className="bg-card rounded-xl border divide-y">
              {consents?.map((form) => (
                <div key={form.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium">{(form as any).clients?.name}</p>
                    <p className="text-xs text-muted-foreground">{form.service_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${form.signed_at ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {form.signed_at ? "Signed" : "Pending"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(form.created_at).toLocaleDateString()}</p>
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
