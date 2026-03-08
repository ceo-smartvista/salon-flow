import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Package, Sparkles, Search, ToggleLeft,
  AlertTriangle, Scissors, Droplets, Palette, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type ActiveTab = "services" | "inventory";

const CATEGORY_ICONS: Record<string, typeof Scissors> = {
  Hair: Scissors,
  Skin: Droplets,
  Nails: Palette,
  Products: ShoppingBag,
};

export default function CatalogPage() {
  const [tab, setTab] = useState<ActiveTab>("services");

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-muted-foreground mt-1">
          Manage your services menu and inventory from one place.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("services")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === "services"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Services
        </button>
        <button
          onClick={() => setTab("inventory")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === "inventory"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          Inventory
        </button>
      </div>

      {tab === "services" ? <ServicesSection /> : <InventorySection />}
    </div>
  );
}

/* ─────────────────────── SERVICES ─────────────────────── */
function ServicesSection() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", category: "Hair", price: "800", duration: "45",
    commission_pct: "40", is_product: false,
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: services } = useQuery({
    queryKey: ["catalog-services"],
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-services"] });
      qc.invalidateQueries({ queryKey: ["pos-services"] });
      setOpen(false);
      setForm({ name: "", category: "Hair", price: "800", duration: "45", commission_pct: "40", is_product: false });
      toast({ title: "Service added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleService = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-services"] });
      qc.invalidateQueries({ queryKey: ["pos-services"] });
    },
  });

  const filtered = services?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Service</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Service name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option>Hair</option><option>Skin</option><option>Nails</option><option>Products</option>
                </select>
                <Input placeholder="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Duration (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                <Input placeholder="Commission %" type="number" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_product} onCheckedChange={(v) => setForm({ ...form, is_product: v })} />
                <span className="text-sm text-muted-foreground">This is a retail product</span>
              </div>
              <Button onClick={() => addService.mutate()} disabled={!form.name || addService.isPending} className="w-full">
                {addService.isPending ? "Adding…" : "Add Service"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["Hair", "Skin", "Nails", "Products"].map((cat) => {
          const Icon = CATEGORY_ICONS[cat] ?? Sparkles;
          const count = services?.filter((s) => s.category === cat).length ?? 0;
          return (
            <div key={cat} className="bg-card rounded-xl border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Icon className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{cat}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">
          {search ? "No services match your search." : "No services yet. Add your first one above."}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => {
          const Icon = CATEGORY_ICONS[cat] ?? Sparkles;
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <Icon className="w-4 h-4" />{cat}
              </div>
              <div className="bg-card rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Price</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Commission</th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((svc) => (
                      <tr key={svc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{svc.name}</td>
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
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─────────────────────── INVENTORY ─────────────────────── */
function InventorySection() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", category: "Hair Color", unit: "grams",
    current_stock: "100", min_stock: "20", cost_per_unit: "5", supplier: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: inventory } = useQuery({
    queryKey: ["catalog-inventory"],
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-inventory"] });
      setOpen(false);
      setForm({ name: "", category: "Hair Color", unit: "grams", current_stock: "100", min_stock: "20", cost_per_unit: "5", supplier: "" });
      toast({ title: "Item added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const autoReorder = useMutation({
    mutationFn: async () => {
      const lowStock = inventory?.filter((i) => i.current_stock <= i.min_stock && i.auto_reorder) ?? [];
      if (!lowStock.length) throw new Error("No items need reordering");
      const pos = lowStock.map((i) => ({
        inventory_id: i.id,
        qty_ordered: i.min_stock * 2,
        estimated_cost: i.cost_per_unit * Number(i.min_stock) * 2,
      }));
      const { error } = await supabase.from("purchase_orders").insert(pos);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase orders created!" });
    },
    onError: (e: any) => toast({ title: "Info", description: e.message }),
  });

  const filtered = inventory?.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const lowStockCount = inventory?.filter((i) => i.current_stock <= i.min_stock).length ?? 0;
  const totalValue = inventory?.reduce((sum, i) => sum + i.cost_per_unit * Number(i.current_stock), 0) ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search inventory…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {lowStockCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-warning border-warning/30" onClick={() => autoReorder.mutate()}>
            <AlertTriangle className="w-4 h-4" />{lowStockCount} Low — Auto-Order
          </Button>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option>Hair Color</option><option>Bleach</option><option>Shampoo</option><option>Conditioner</option><option>Skincare</option><option>Nails</option><option>Other</option>
                </select>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option>grams</option><option>ml</option><option>units</option><option>pumps</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Stock" type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
                <Input placeholder="Min stock" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                <Input placeholder="₹/unit" type="number" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} />
              </div>
              <Input placeholder="Supplier (optional)" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              <Button onClick={() => addItem.mutate()} disabled={!form.name || addItem.isPending} className="w-full">
                {addItem.isPending ? "Adding…" : "Add Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Items</p>
          <p className="text-2xl font-bold">{inventory?.length ?? 0}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Low Stock</p>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-destructive" : ""}`}>{lowStockCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Inventory Value</p>
          <p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">
          {search ? "No items match your search." : "No inventory items yet. Add your first product above."}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Product</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Min</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Cost/Unit</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => {
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

      {/* Recent Purchase Orders */}
      {orders && orders.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Recent Purchase Orders</h2>
          <div className="bg-card rounded-xl border divide-y divide-border">
            {orders.map((po) => (
              <div key={po.id} className="flex items-center justify-between px-4 py-3">
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
