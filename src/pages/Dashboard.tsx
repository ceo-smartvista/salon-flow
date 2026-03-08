import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";

const stats = [
  { label: "Today's Revenue", value: "₹24,500", change: "+12%", icon: DollarSign, color: "text-success" },
  { label: "Appointments", value: "18", change: "+3", icon: Calendar, color: "text-primary" },
  { label: "Active Clients", value: "142", change: "+8", icon: Users, color: "text-accent-foreground" },
  { label: "Avg. Ticket Size", value: "₹1,360", change: "+5%", icon: TrendingUp, color: "text-warning" },
];

const todayAppointments = [
  { time: "10:00 AM", client: "Priya Sharma", service: "Balayage + Cut", stylist: "Anita", status: "confirmed" },
  { time: "11:30 AM", client: "Meera Patel", service: "Facial + Cleanup", stylist: "Ritu", status: "confirmed" },
  { time: "01:00 PM", client: "Kavya Nair", service: "Hair Spa", stylist: "Anita", status: "pending" },
  { time: "02:30 PM", client: "Sneha Gupta", service: "Keratin Treatment", stylist: "Priya", status: "confirmed" },
  { time: "04:00 PM", client: "Rina Das", service: "Manicure + Pedicure", stylist: "Ritu", status: "pending" },
];

const topStylists = [
  { name: "Anita K.", revenue: "₹8,200", appointments: 6 },
  { name: "Ritu M.", revenue: "₹6,800", appointments: 5 },
  { name: "Priya S.", revenue: "₹5,100", appointments: 4 },
];

export default function Dashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here's today's overview.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border p-5 flex flex-col gap-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-serif font-semibold">{stat.value}</span>
              <span className="text-xs text-success font-medium flex items-center gap-0.5 mb-1">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2 bg-card rounded-xl border">
          <div className="flex items-center justify-between p-5 border-b">
            <h2 className="text-lg font-serif font-semibold">Today's Schedule</h2>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {todayAppointments.length} appointments
            </span>
          </div>
          <div className="divide-y">
            {todayAppointments.map((apt, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">
                  {apt.time}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{apt.client}</p>
                  <p className="text-xs text-muted-foreground truncate">{apt.service}</p>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{apt.stylist}</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    apt.status === "confirmed"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top stylists */}
        <div className="bg-card rounded-xl border">
          <div className="p-5 border-b">
            <h2 className="text-lg font-serif font-semibold">Top Stylists</h2>
          </div>
          <div className="p-5 space-y-4">
            {topStylists.map((stylist, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
                  {stylist.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{stylist.name}</p>
                  <p className="text-xs text-muted-foreground">{stylist.appointments} bookings</p>
                </div>
                <span className="text-sm font-semibold">{stylist.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
