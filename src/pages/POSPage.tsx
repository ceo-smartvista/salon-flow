import { useState } from "react";
import { Search, Plus, Minus, X, CreditCard, Banknote, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const serviceMenu = [
  { category: "Hair", items: [
    { name: "Haircut & Blow Dry", price: 800, duration: 45 },
    { name: "Balayage", price: 4500, duration: 120 },
    { name: "Keratin Treatment", price: 5000, duration: 150 },
    { name: "Hair Spa", price: 1500, duration: 60 },
    { name: "Hair Color (Global)", price: 3000, duration: 90 },
    { name: "Root Touch-Up", price: 1200, duration: 45 },
  ]},
  { category: "Skin", items: [
    { name: "Classic Facial", price: 1200, duration: 60 },
    { name: "Cleanup", price: 600, duration: 30 },
    { name: "Chemical Peel", price: 2500, duration: 45 },
  ]},
  { category: "Nails", items: [
    { name: "Manicure", price: 500, duration: 30 },
    { name: "Pedicure", price: 700, duration: 40 },
    { name: "Gel Nails", price: 1800, duration: 60 },
  ]},
  { category: "Products", items: [
    { name: "Shampoo (300ml)", price: 650, duration: 0 },
    { name: "Hair Serum", price: 450, duration: 0 },
    { name: "Conditioner (250ml)", price: 550, duration: 0 },
  ]},
];

type CartItem = { name: string; price: number; qty: number };

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tip, setTip] = useState(0);
  const [selectedClient, setSelectedClient] = useState("Priya Sharma");
  const [selectedStylist, setSelectedStylist] = useState("Anita K.");

  const addToCart = (name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.name === name);
      if (existing) return prev.map((item) => item.name === name ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { name, price, qty: 1 }];
    });
  };

  const updateQty = (name: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => item.name === name ? { ...item, qty: item.qty + delta } : item)
        .filter((item) => item.qty > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax + tip;

  const filteredMenu = serviceMenu.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase())),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground mt-1">Create a new bill for a client visit.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Service Menu - Left */}
        <div className="lg:col-span-3 space-y-4">
          {/* Client & Stylist selector */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border bg-card text-sm"
              >
                <option>Priya Sharma</option>
                <option>Meera Patel</option>
                <option>Kavya Nair</option>
                <option>Sneha Gupta</option>
                <option>Walk-in Client</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Stylist</label>
              <select
                value={selectedStylist}
                onChange={(e) => setSelectedStylist(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border bg-card text-sm"
              >
                <option>Anita K.</option>
                <option>Ritu M.</option>
                <option>Priya S.</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search services or products..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Service grid */}
          <div className="space-y-5">
            {filteredMenu.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {cat.category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((item) => {
                    const inCart = cart.find((c) => c.name === item.name);
                    return (
                      <button
                        key={item.name}
                        onClick={() => addToCart(item.name, item.price)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors hover:border-primary/40 hover:bg-accent/50 ${
                          inCart ? "border-primary/40 bg-accent/50" : "bg-card"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.duration > 0 && (
                            <p className="text-xs text-muted-foreground">{item.duration} min</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">₹{item.price.toLocaleString()}</span>
                          {inCart && (
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                              {inCart.qty}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart - Right */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border sticky top-6">
            <div className="p-4 border-b">
              <h2 className="font-display font-bold text-lg">Current Bill</h2>
              <p className="text-xs text-muted-foreground">{selectedClient} · {selectedStylist}</p>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Tap services to add them to the bill
              </div>
            ) : (
              <div className="divide-y max-h-[320px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.name} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price.toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.name, -1)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        {item.qty === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.name, 1)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">
                      ₹{(item.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tip */}
            {cart.length > 0 && (
              <div className="px-4 py-3 border-t">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Add Tip</label>
                <div className="flex gap-2">
                  {[0, 50, 100, 200].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTip(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        tip === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-muted"
                      }`}
                    >
                      {t === 0 ? "None" : `₹${t}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="px-4 py-3 border-t space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST (18%)</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tip</span>
                    <span>₹{tip}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold pt-1.5 border-t">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Payment buttons */}
            {cart.length > 0 && (
              <div className="p-4 border-t space-y-2">
                <Button className="w-full gap-2" size="sm">
                  <Smartphone className="w-4 h-4" />
                  Send Payment Link
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    Card
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Banknote className="w-4 h-4" />
                    Cash
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
