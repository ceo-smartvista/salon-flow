import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Minus, X, CreditCard, Banknote, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type CartItem = { name: string; price: number; qty: number; service_id: string; commission_pct: number };

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tip, setTip] = useState(0);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: services } = useQuery({
    queryKey: ["pos-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").eq("active", true).order("category");
      return data ?? [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["pos-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ["pos-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("id, name").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const completeSale = useMutation({
    mutationFn: async (method: string) => {
      const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = Math.round(subtotal * 0.18);
      const total = subtotal + tax + tip;

      const { data: sale, error } = await supabase.from("sales").insert({
        client_id: selectedClient || null,
        staff_id: selectedStaff || null,
        subtotal, tax, tip, total,
        payment_method: method,
      }).select().single();
      if (error) throw error;

      const items = cart.map((i) => ({
        sale_id: sale.id,
        service_id: i.service_id,
        name: i.name,
        price: i.price * i.qty,
        qty: i.qty,
        commission_pct: i.commission_pct,
      }));
      const { error: itemErr } = await supabase.from("sale_items").insert(items);
      if (itemErr) throw itemErr;
    },
    onSuccess: () => {
      toast({ title: "Sale completed!" });
      setCart([]);
      setTip(0);
      qc.invalidateQueries({ queryKey: ["dashboard-sales"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addToCart = (svc: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.service_id === svc.id);
      if (existing) return prev.map((i) => i.service_id === svc.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { name: svc.name, price: svc.price, qty: 1, service_id: svc.id, commission_pct: svc.commission_pct }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.service_id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax + tip;

  const categories = [...new Set(services?.map((s) => s.category) ?? [])];
  const filtered = services?.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())) ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground mt-1">Create a new bill for a client visit.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client</label>
              <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full h-9 px-3 rounded-lg border bg-card text-sm">
                <option value="">Walk-in Client</option>
                {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Stylist</label>
              <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full h-9 px-3 rounded-lg border bg-card text-sm">
                <option value="">Select stylist</option>
                {staff?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search services or products..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          {services?.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">
              No services added yet. Go to Settings → Services to add them.
            </div>
          ) : (
            <div className="space-y-5">
              {categories.map((cat) => {
                const items = filtered.filter((s) => s.category === cat);
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((svc) => {
                        const inCart = cart.find((c) => c.service_id === svc.id);
                        return (
                          <button key={svc.id} onClick={() => addToCart(svc)}
                            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors hover:border-primary/40 hover:bg-accent/50 ${inCart ? "border-primary/40 bg-accent/50" : "bg-card"}`}>
                            <div>
                              <p className="text-sm font-medium">{svc.name}</p>
                              {svc.duration > 0 && <p className="text-xs text-muted-foreground">{svc.duration} min</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">₹{svc.price.toLocaleString()}</span>
                              {inCart && <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">{inCart.qty}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border sticky top-6">
            <div className="p-4 border-b">
              <h2 className="font-display font-bold text-lg">Current Bill</h2>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Tap services to add them to the bill</div>
            ) : (
              <>
                <div className="divide-y max-h-[320px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.service_id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price.toLocaleString()} × {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.service_id, -1)} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors">
                          {item.qty === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="text-sm font-medium w-5 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.service_id, 1)} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold w-16 text-right">₹{(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Add Tip</label>
                  <div className="flex gap-2">
                    {[0, 50, 100, 200].map((t) => (
                      <button key={t} onClick={() => setTip(t)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tip === t ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
                        {t === 0 ? "None" : `₹${t}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-4 py-3 border-t space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm text-muted-foreground"><span>GST (18%)</span><span>₹{tax.toLocaleString()}</span></div>
                  {tip > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Tip</span><span>₹{tip}</span></div>}
                  <div className="flex justify-between text-base font-semibold pt-1.5 border-t"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
                </div>

                <div className="p-4 border-t space-y-2">
                  <Button className="w-full gap-2" size="sm" onClick={() => completeSale.mutate("upi")} disabled={completeSale.isPending}>
                    <Smartphone className="w-4 h-4" />Send Payment Link
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => completeSale.mutate("card")} disabled={completeSale.isPending}>
                      <CreditCard className="w-4 h-4" />Card
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => completeSale.mutate("cash")} disabled={completeSale.isPending}>
                      <Banknote className="w-4 h-4" />Cash
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
