import { Search, Plus, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const clients = [
  { name: "Priya Sharma", phone: "+91 98765 43210", email: "priya@email.com", visits: 24, spend: "₹48,200", lastVisit: "Mar 5, 2026", notes: "Prefers balayage, allergic to ammonia" },
  { name: "Meera Patel", phone: "+91 87654 32109", email: "meera@email.com", visits: 12, spend: "₹22,800", lastVisit: "Mar 3, 2026", notes: "Sensitive skin, organic products only" },
  { name: "Kavya Nair", phone: "+91 76543 21098", email: "kavya@email.com", visits: 8, spend: "₹15,600", lastVisit: "Feb 28, 2026", notes: "Hair color formula: 5N + 20vol" },
  { name: "Sneha Gupta", phone: "+91 65432 10987", email: "sneha@email.com", visits: 18, spend: "₹35,100", lastVisit: "Mar 7, 2026", notes: "VIP client, monthly keratin" },
  { name: "Rina Das", phone: "+91 54321 09876", email: "rina@email.com", visits: 6, spend: "₹9,400", lastVisit: "Feb 20, 2026", notes: "New client, referred by Sneha" },
  { name: "Aisha Khan", phone: "+91 43210 98765", email: "aisha@email.com", visits: 15, spend: "₹28,700", lastVisit: "Mar 6, 2026", notes: "Bridal package client" },
];

export default function ClientsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} clients in your database</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search clients by name, phone, or email..." className="pl-9" />
      </div>

      {/* Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((client, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground flex-shrink-0">
                {client.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{client.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {client.phone}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded-lg py-2">
                <p className="text-xs text-muted-foreground">Visits</p>
                <p className="text-sm font-semibold">{client.visits}</p>
              </div>
              <div className="bg-muted rounded-lg py-2">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-sm font-semibold">{client.spend}</p>
              </div>
              <div className="bg-muted rounded-lg py-2">
                <p className="text-xs text-muted-foreground">Last Visit</p>
                <p className="text-sm font-semibold truncate px-1">{client.lastVisit.split(",")[0]}</p>
              </div>
            </div>

            {client.notes && (
              <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 italic truncate">
                {client.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
