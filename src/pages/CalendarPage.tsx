import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const hours = Array.from({ length: 11 }, (_, i) => i + 9); // 9 AM to 7 PM

const staff = [
  { name: "Anita K.", color: "bg-primary/20 border-primary/40 text-primary" },
  { name: "Ritu M.", color: "bg-success/20 border-success/40 text-success" },
  { name: "Priya S.", color: "bg-warning/20 border-warning/40 text-warning" },
];

const sampleAppointments = [
  { staff: 0, startHour: 10, duration: 1.5, client: "Priya S.", service: "Balayage" },
  { staff: 0, startHour: 14, duration: 1, client: "Kavya N.", service: "Hair Spa" },
  { staff: 1, startHour: 9, duration: 1, client: "Meera P.", service: "Facial" },
  { staff: 1, startHour: 11, duration: 2, client: "Sneha G.", service: "Keratin" },
  { staff: 1, startHour: 15, duration: 1, client: "Rina D.", service: "Manicure" },
  { staff: 2, startHour: 10, duration: 1, client: "Aisha K.", service: "Blow Dry" },
  { staff: 2, startHour: 13, duration: 1.5, client: "Tanya J.", service: "Color" },
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const [currentDate] = useState(new Date());

  const dayName = daysOfWeek[currentDate.getDay()];
  const dayNum = currentDate.getDate();
  const monthName = months[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            {dayName}, {monthName} {dayNum}, {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium">
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {/* Staff header */}
        <div className="grid border-b" style={{ gridTemplateColumns: "64px repeat(3, 1fr)" }}>
          <div className="border-r p-3" />
          {staff.map((s, i) => (
            <div key={i} className="p-3 text-center border-r last:border-r-0">
              <span className="text-sm font-semibold">{s.name}</span>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: "64px repeat(3, 1fr)", height: "64px" }}
            >
              <div className="border-r px-3 py-1 flex items-start">
                <span className="text-xs text-muted-foreground font-medium">
                  {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
                </span>
              </div>
              {staff.map((_, si) => (
                <div
                  key={si}
                  className="border-r last:border-r-0 hover:bg-muted/30 transition-colors cursor-pointer relative"
                />
              ))}
            </div>
          ))}

          {/* Appointment blocks */}
          {sampleAppointments.map((apt, i) => {
            const top = (apt.startHour - 9) * 64;
            const height = apt.duration * 64 - 4;
            const left = `calc(64px + ${apt.staff} * ((100% - 64px) / 3) + 4px)`;
            const width = `calc((100% - 64px) / 3 - 8px)`;

            return (
              <div
                key={i}
                className={`absolute rounded-lg border px-2.5 py-1.5 cursor-pointer hover:shadow-md transition-shadow ${staff[apt.staff].color}`}
                style={{ top: `${top + 2}px`, height: `${height}px`, left, width }}
              >
                <p className="text-xs font-semibold truncate">{apt.client}</p>
                <p className="text-xs opacity-70 truncate">{apt.service}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
