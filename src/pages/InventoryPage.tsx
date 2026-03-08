import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, AlertTriangle, Plus, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function InventoryPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Hair Color", unit: "grams", current_stock: "100", min_stock: "20", cost_per_unit: "5", supplier: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: inventory } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("*, inventory(name)").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory").insert({
        name: form.name, category: form.category, unit: form.unit,
        current_stock: Number(form.current_stock), min_stock: Number(form.min_stock),
        cost_per_unit: Number(form.cost_per_unit), supplier: form.supplier || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setOpen(false); toast({ title: "Item added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const autoReorder = useMutation({
    mutationFn: async () => {
      const lowStock = inventory?.filter((i) => i.current_stock <= i.min_stock && i.auto_reorder) ?? [];
      if (!lowStock.length) throw new Error("No items need reordering");
      const pos = lowStock.map((i) => ({
        inventory_id: i.id,
        qty_ordered: i.min_stock * 2,
        estimated_cost: i.cost_per_unit * i.min_stock * 2,
      }));
      const { error } = await supabase.from("purchase_orders").insert(pos);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); toast({ title: "Purchase orders created!" }); },
    onError: (e: any) => toast({ title: "Info", description: e.message }),
  });

  const lowStockCount = inventory?.filter((i) => i.current_stock <= i.min_stock).length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Track products, auto-generate purchase orders.</p>
        </div>
        <div className="flex gap-2">
          {lowStockCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-warning border-warning/30" onClick={() => autoReorder.mutate()}>
              <AlertTriangle className="w-4 h-4" />{lowStockCount} Low Stock — Auto-Order
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 px-3 rounded-lg border bg-background text-sm">
                    <option>Hair Color</option><option>Bleach</option><option>Shampoo</option><option>Conditioner</option><option>Skincare</option><option>Nails</option><option>Other</option>
                  </select>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-9 px-3 rounded-lg border bg-background text-sm">
                    <option>grams</option><option>ml</option><option>units</option><option>pumps</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="Stock" type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
                  <Input placeholder="Min stock" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                  <Input placeholder="₹/unit" type="number" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} />
                </div>
                <Input placeholder="Supplier (optional)" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
                <Button onClick={() => addItem.mutate()} disabled={!form.name || addItem.isPending} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {inventory?.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">No inventory items yet. Add your first product above.</div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Min</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Cost/Unit</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory?.map((item) => {
                const isLow = item.current_stock <= item.min_stock;
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category} · {item.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{item.current_stock} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{item.min_stock}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">₹{item.cost_per_unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isLow ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                        {isLow ? "Low" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-bold mb-3">Recent Purchase Orders</h2>
          <div className="bg-card rounded-xl border divide-y">
            {orders.map((po) => (
              <div key={po.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{(po as any).inventory?.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {po.qty_ordered} · Est. ₹{po.estimated_cost}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${po.status === "pending" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                  {po.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
