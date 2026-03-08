import { useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const initialServices = [
  { name: "Haircut & Blow Dry", price: 800, duration: 45, commission: 40, active: true },
  { name: "Balayage", price: 4500, duration: 120, commission: 35, active: true },
  { name: "Keratin Treatment", price: 5000, duration: 150, commission: 30, active: true },
  { name: "Hair Spa", price: 1500, duration: 60, commission: 40, active: true },
  { name: "Classic Facial", price: 1200, duration: 60, commission: 35, active: true },
  { name: "Manicure", price: 500, duration: 30, commission: 45, active: true },
  { name: "Pedicure", price: 700, duration: 40, commission: 45, active: true },
];

const staffMembers = [
  { name: "Anita K.", role: "Senior Stylist", commissionType: "percentage" as const, rate: 40 },
  { name: "Ritu M.", role: "Therapist", commissionType: "percentage" as const, rate: 35 },
  { name: "Priya S.", role: "Junior Stylist", commissionType: "percentage" as const, rate: 30 },
];

type Tab = "salon" | "services" | "staff" | "commissions";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("salon");

  const tabs: { id: Tab; label: string }[] = [
    { id: "salon", label: "Salon Details" },
    { id: "services", label: "Services" },
    { id: "staff", label: "Staff" },
    { id: "commissions", label: "Commissions" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your salon configuration.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Salon Details */}
      {activeTab === "salon" && (
        <div className="bg-card rounded-xl border p-6 space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Salon Name</label>
              <Input defaultValue="Luxe Studio Salon" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <Input defaultValue="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input defaultValue="hello@luxestudio.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Currency</label>
              <select className="w-full h-9 px-3 rounded-lg border bg-background text-sm">
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>GBP (£)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Address</label>
              <Input defaultValue="42 MG Road, Bengaluru, Karnataka 560001" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm font-medium">Online Booking</p>
              <p className="text-xs text-muted-foreground">Allow clients to book via your public page</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">WhatsApp Reminders</p>
              <p className="text-xs text-muted-foreground">Send automated booking confirmations</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button size="sm" className="gap-1.5">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      )}

      {/* Services */}
      {activeTab === "services" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Service
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Commission</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {initialServices.map((service, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{service.name}</td>
                    <td className="px-4 py-3 text-right">₹{service.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{service.duration} min</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{service.commission}%</td>
                    <td className="px-4 py-3 text-center">
                      <Switch defaultChecked={service.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff */}
      {activeTab === "staff" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Staff
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffMembers.map((member, i) => (
              <div key={i} className="bg-card rounded-xl border p-5">
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
                  <span className="text-sm font-semibold">{member.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commissions */}
      {activeTab === "commissions" && (
        <div className="bg-card rounded-xl border p-6 space-y-5 animate-fade-in">
          <div>
            <h3 className="font-serif font-semibold text-lg">Commission Rules</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Define how staff commissions are calculated per service category.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { category: "Haircuts", rate: 40, deduction: 0 },
              { category: "Color & Chemical", rate: 35, deduction: 500 },
              { category: "Skin Treatments", rate: 35, deduction: 300 },
              { category: "Nails", rate: 45, deduction: 100 },
              { category: "Product Sales", rate: 10, deduction: 0 },
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                <span className="text-sm font-medium flex-1">{rule.category}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold">{rule.rate}%</span>
                  {rule.deduction > 0 && (
                    <p className="text-xs text-muted-foreground">−₹{rule.deduction} material cost</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Formula: (Service Price − Material Cost) × Commission % + Tips
          </p>
          <Button size="sm" className="gap-1.5">
            <Save className="w-4 h-4" />
            Save Rules
          </Button>
        </div>
      )}
    </div>
  );
}
