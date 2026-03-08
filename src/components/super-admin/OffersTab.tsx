import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Tag, Copy } from "lucide-react";
import { format } from "date-fns";

export default function OffersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    code: "",
    max_uses: "",
    valid_until: "",
  });

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["sa-platform-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_offers").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createOffer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("platform_offers").insert({
        name: form.name,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        code: form.code || null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-platform-offers"] });
      setOpen(false);
      setForm({ name: "", description: "", discount_type: "percentage", discount_value: 10, code: "", max_uses: "", valid_until: "" });
      toast({ title: "Offer created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("platform_offers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sa-platform-offers"] }),
  });

  const deleteOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-platform-offers"] });
      toast({ title: "Offer deleted" });
    },
  });

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "SALON-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Badge variant="outline" className="text-xs">
          {offers.filter(o => o.active).length} active offers
        </Badge>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Offer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Platform Offer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Offer Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Early Bird Discount" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <Label>Coupon Code</Label>
                <div className="flex gap-2">
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SALON-XXXXX" />
                  <Button type="button" variant="outline" size="sm" onClick={generateCode}>Generate</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Uses (optional)</Label>
                  <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" />
                </div>
                <div>
                  <Label>Valid Until (optional)</Label>
                  <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>
              <Button onClick={() => createOffer.mutate()} disabled={!form.name || form.discount_value <= 0} className="w-full">
                Create Offer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : offers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No offers yet</TableCell></TableRow>
            ) : (
              offers.map(offer => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{offer.name}</p>
                      {offer.description && <p className="text-xs text-muted-foreground">{offer.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {offer.code ? (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(offer.code!);
                          toast({ title: "Code copied!" });
                        }}
                        className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded hover:bg-accent transition-colors"
                      >
                        {offer.code} <Copy className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Tag className="w-3 h-3" />
                      {offer.discount_value}{offer.discount_type === "percentage" ? "%" : " ₹"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {offer.current_uses}{offer.max_uses ? `/${offer.max_uses}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {offer.valid_until ? format(new Date(offer.valid_until), "dd MMM yyyy") : "No expiry"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={offer.active}
                      onCheckedChange={active => toggleActive.mutate({ id: offer.id, active })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => deleteOffer.mutate(offer.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
