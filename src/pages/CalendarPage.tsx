import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const hours = Array.from({ length: 11 }, (_, i) => i + 9);

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateStr = currentDate.toISOString().split("T")[0];

  const { data: staff } = useQuery({
    queryKey: ["calendar-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*").eq("active", true);
      return data ?? [];
    },
  });

  const { data: appointments } = useQuery({
    queryKey: ["calendar-appointments", dateStr],
    queryFn: async () => {
      const start = `${dateStr}T00:00:00`;
      const end = `${dateStr}T23:59:59`;
      const { data } = await supabase
        .from("appointments")
        .select("*, clients(name), services(name)")
        .gte("start_time", start)
        .lte("start_time", end);
      return data ?? [];
    },
  });

  const staffColors = [
    "bg-primary/20 border-primary/40 text-primary",
    "bg-success/20 border-success/40 text-success",
    "bg-warning/20 border-warning/40 text-warning",
  ];

  const goDay = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(d);
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            {daysOfWeek[currentDate.getDay()]}, {months[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Booking
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        {!staff?.length ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Add staff in Settings to see the calendar grid.
          </div>
        ) : (
          <>
            <div className="grid border-b" style={{ gridTemplateColumns: `64px repeat(${staff.length}, 1fr)` }}>
              <div className="border-r p-3" />
              {staff.map((s, i) => (
                <div key={s.id} className="p-3 text-center border-r last:border-r-0">
                  <span className="text-sm font-semibold">{s.name}</span>
                </div>
              ))}
            </div>
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="grid border-b last:border-b-0" style={{ gridTemplateColumns: `64px repeat(${staff.length}, 1fr)`, height: "64px" }}>
                  <div className="border-r px-3 py-1 flex items-start">
                    <span className="text-xs text-muted-foreground font-medium">
                      {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
                    </span>
                  </div>
                  {staff.map((_, si) => (
                    <div key={si} className="border-r last:border-r-0 hover:bg-muted/30 transition-colors cursor-pointer" />
                  ))}
                </div>
              ))}

              {appointments?.map((apt) => {
                const staffIndex = staff.findIndex((s) => s.id === apt.staff_id);
                if (staffIndex === -1) return null;
                const startDate = new Date(apt.start_time);
                const endDate = new Date(apt.end_time);
                const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                const duration = (endDate.getTime() - startDate.getTime()) / 3600000;
                const top = (startHour - 9) * 64;
                const height = duration * 64 - 4;
                const left = `calc(64px + ${staffIndex} * ((100% - 64px) / ${staff.length}) + 4px)`;
                const width = `calc((100% - 64px) / ${staff.length} - 8px)`;

                return (
                  <div
                    key={apt.id}
                    className={`absolute rounded-lg border px-2.5 py-1.5 cursor-pointer hover:shadow-md transition-shadow ${staffColors[staffIndex % staffColors.length]}`}
                    style={{ top: `${top + 2}px`, height: `${height}px`, left, width }}
                  >
                    <p className="text-xs font-semibold truncate">{(apt as any).clients?.name ?? "Client"}</p>
                    <p className="text-xs opacity-70 truncate">{(apt as any).services?.name ?? "Service"}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
