import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, setHours, setMinutes, isBefore, addMinutes } from "date-fns";
import { Scissors, Clock, ChevronRight, CalendarIcon, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "services" | "staff" | "datetime" | "details" | "confirmed";

export default function BookingPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("services");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientForm, setClientForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const { data: salon } = useQuery({
    queryKey: ["public-salon"],
    queryFn: async () => {
      const { data } = await supabase.from("salon_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["public-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").eq("active", true).eq("is_product", false).order("category").order("name");
      return data ?? [];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ["public-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const { data: existingAppointments } = useQuery({
    queryKey: ["public-appointments", selectedDate, selectedStaff?.id],
    queryFn: async () => {
      if (!selectedDate || !selectedStaff) return [];
      const dayStart = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      const dayEnd = format(selectedDate, "yyyy-MM-dd'T'23:59:59");
      const { data } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("staff_id", selectedStaff.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .neq("status", "cancelled");
      return data ?? [];
    },
    enabled: !!selectedDate && !!selectedStaff,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      // Find or create client
      let clientId: string;
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", clientForm.phone)
        .limit(1)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({ name: clientForm.name, phone: clientForm.phone, email: clientForm.email || null })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }

      const startTime = new Date(selectedDate!);
      const [h, m] = selectedTime.split(":").map(Number);
      startTime.setHours(h, m, 0, 0);
      const endTime = addMinutes(startTime, selectedService.duration);

      const { error } = await supabase.from("appointments").insert({
        client_id: clientId,
        service_id: selectedService.id,
        staff_id: selectedStaff.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: clientForm.notes || null,
        status: "confirmed",
      });
      if (error) throw error;
    },
    onSuccess: () => setStep("confirmed"),
    onError: (e: any) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
  });

  // Generate available time slots
  const generateSlots = () => {
    if (!selectedDate || !selectedService) return [];
    const slots: string[] = [];
    const now = new Date();
    for (let hour = 9; hour < 19; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = setMinutes(setHours(new Date(selectedDate), hour), min);
        const slotEnd = addMinutes(slotStart, selectedService.duration);
        if (slotEnd.getHours() > 19) continue;
        if (isBefore(slotStart, now)) continue;
        // Check conflicts
        const conflict = existingAppointments?.some((apt) => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return slotStart < aptEnd && slotEnd > aptStart;
        });
        if (!conflict) slots.push(`${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
    return slots;
  };

  const groupedServices = services?.reduce((acc: Record<string, any[]>, svc) => {
    (acc[svc.category] = acc[svc.category] || []).push(svc);
    return acc;
  }, {}) ?? {};

  const currency = salon?.currency === "USD" ? "$" : salon?.currency === "GBP" ? "£" : "₹";

  if (salon && !salon.online_booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Scissors className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Online Booking Unavailable</h1>
          <p className="text-muted-foreground">This salon is not currently accepting online bookings. Please call to schedule an appointment.</p>
          {salon.phone && <p className="mt-4 text-lg font-semibold">{salon.phone}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{salon?.name ?? "Book Appointment"}</h1>
            {salon?.address && <p className="text-xs text-muted-foreground">{salon.address}</p>}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-6">
          {["Service", "Stylist", "Date & Time", "Your Details"].map((label, i) => {
            const steps: Step[] = ["services", "staff", "datetime", "details"];
            const isActive = steps.indexOf(step) >= i;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <span className={isActive ? "text-primary font-semibold" : ""}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step: Services */}
        {step === "services" && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-2xl font-display font-bold">Choose a Service</h2>
              <p className="text-muted-foreground mt-1">Select the service you'd like to book.</p>
            </div>
            {Object.entries(groupedServices).map(([cat, svcs]) => (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
                <div className="space-y-2">
                  {svcs.map((svc: any) => (
                    <button
                      key={svc.id}
                      onClick={() => { setSelectedService(svc); setStep("staff"); }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left",
                        selectedService?.id === svc.id && "border-primary ring-1 ring-primary"
                      )}
                    >
                      <div>
                        <p className="font-semibold text-sm">{svc.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />{svc.duration} min
                        </p>
                      </div>
                      <span className="font-display font-bold text-primary">{currency}{svc.price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {services?.length === 0 && (
              <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground text-sm">
                No services available at the moment.
              </div>
            )}
          </div>
        )}

        {/* Step: Staff */}
        {step === "staff" && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => setStep("services")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />Back
            </button>
            <div>
              <h2 className="text-2xl font-display font-bold">Choose a Stylist</h2>
              <p className="text-muted-foreground mt-1">Select your preferred stylist for {selectedService?.name}.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {staff?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => { setSelectedStaff(member); setStep("datetime"); }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all",
                    selectedStaff?.id === member.id && "border-primary ring-1 ring-primary"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground">
                    {member.name.charAt(0)}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Date & Time */}
        {step === "datetime" && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => setStep("staff")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />Back
            </button>
            <div>
              <h2 className="text-2xl font-display font-bold">Pick a Date & Time</h2>
              <p className="text-muted-foreground mt-1">{selectedService?.name} with {selectedStaff?.name}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                  disabled={(date) => isBefore(date, addDays(new Date(), -1)) || date.getDay() === 0}
                  className="pointer-events-auto"
                />
              </div>
              <div>
                {selectedDate ? (
                  <>
                    <p className="text-sm font-medium mb-3">{format(selectedDate, "EEEE, MMMM d")}</p>
                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {generateSlots().map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={cn(
                            "py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                            selectedTime === slot
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover:border-primary/50"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                      {generateSlots().length === 0 && (
                        <p className="col-span-3 text-sm text-muted-foreground py-4 text-center">No available slots for this date.</p>
                      )}
                    </div>
                    {selectedTime && (
                      <Button className="w-full mt-4" onClick={() => setStep("details")}>
                        Continue
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">Select a date to see available times.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step: Client details */}
        {step === "details" && (
          <div className="animate-fade-in space-y-6 max-w-md">
            <button onClick={() => setStep("datetime")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />Back
            </button>
            <div>
              <h2 className="text-2xl font-display font-bold">Your Details</h2>
              <p className="text-muted-foreground mt-1">Almost there! Enter your information to confirm.</p>
            </div>

            {/* Summary */}
            <div className="bg-card rounded-xl border p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{selectedService?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stylist</span><span className="font-medium">{selectedStaff?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{selectedDate && format(selectedDate, "EEE, MMM d")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{selectedTime}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Price</span><span className="font-display font-bold text-primary">{currency}{selectedService?.price.toLocaleString()}</span></div>
            </div>

            <div className="space-y-3">
              <Input placeholder="Full Name *" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
              <Input placeholder="Phone Number *" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
              <Input placeholder="Email (optional)" type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              <Input placeholder="Notes (optional)" value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
              <Button
                className="w-full"
                size="lg"
                disabled={!clientForm.name || !clientForm.phone || bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
              >
                {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Confirmed */}
        {step === "confirmed" && (
          <div className="animate-fade-in text-center py-16 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-6">
              Your appointment for <strong>{selectedService?.name}</strong> with <strong>{selectedStaff?.name}</strong> on{" "}
              <strong>{selectedDate && format(selectedDate, "EEE, MMM d")}</strong> at <strong>{selectedTime}</strong> has been confirmed.
            </p>
            <Button variant="outline" onClick={() => { setStep("services"); setSelectedService(null); setSelectedStaff(null); setSelectedDate(undefined); setSelectedTime(""); setClientForm({ name: "", phone: "", email: "", notes: "" }); }}>
              Book Another Appointment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
