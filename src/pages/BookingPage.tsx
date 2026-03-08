import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, setHours, setMinutes, isBefore, addMinutes } from "date-fns";
import {
  Scissors, Clock, ChevronRight, Check, ArrowLeft, Sparkles,
  User, CalendarDays, MapPin, Phone, Mail, MessageSquare, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "services" | "staff" | "datetime" | "details" | "confirmed";

const STEP_LIST: { key: Step; label: string; icon: typeof Scissors }[] = [
  { key: "services", label: "Service", icon: Sparkles },
  { key: "staff", label: "Stylist", icon: User },
  { key: "datetime", label: "Schedule", icon: CalendarDays },
  { key: "details", label: "Confirm", icon: Check },
];

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
      let clientId: string;
      const { data: existingClient } = await supabase
        .from("clients").select("id").eq("phone", clientForm.phone).limit(1).maybeSingle();
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({ name: clientForm.name, phone: clientForm.phone, email: clientForm.email || null })
          .select("id").single();
        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }
      const startTime = new Date(selectedDate!);
      const [h, m] = selectedTime.split(":").map(Number);
      startTime.setHours(h, m, 0, 0);
      const endTime = addMinutes(startTime, selectedService.duration);
      const { error } = await supabase.from("appointments").insert({
        client_id: clientId, service_id: selectedService.id, staff_id: selectedStaff.id,
        start_time: startTime.toISOString(), end_time: endTime.toISOString(),
        notes: clientForm.notes || null, status: "confirmed",
      });
      if (error) throw error;
    },
    onSuccess: () => setStep("confirmed"),
    onError: (e: any) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
  });

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    const slots: string[] = [];
    const now = new Date();
    for (let hour = 9; hour < 19; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = setMinutes(setHours(new Date(selectedDate), hour), min);
        const slotEnd = addMinutes(slotStart, selectedService.duration);
        if (slotEnd.getHours() > 19) continue;
        if (isBefore(slotStart, now)) continue;
        const conflict = existingAppointments?.some((apt) => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return slotStart < aptEnd && slotEnd > aptStart;
        });
        if (!conflict) slots.push(`${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
    return slots;
  }, [selectedDate, selectedService, existingAppointments]);

  const groupedServices = useMemo(() =>
    services?.reduce((acc: Record<string, any[]>, svc) => {
      (acc[svc.category] = acc[svc.category] || []).push(svc);
      return acc;
    }, {}) ?? {}
  , [services]);

  const currency = salon?.currency === "USD" ? "$" : salon?.currency === "GBP" ? "£" : "₹";
  const currentStepIndex = STEP_LIST.findIndex((s) => s.key === step);

  const resetBooking = () => {
    setStep("services");
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setClientForm({ name: "", phone: "", email: "", notes: "" });
  };

  // Booking disabled state
  if (salon && !salon.online_booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Scissors className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Online Booking Unavailable</h1>
          <p className="text-muted-foreground text-lg">This salon is not currently accepting online bookings.</p>
          {salon.phone && (
            <a href={`tel:${salon.phone}`} className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              <Phone className="w-4 h-4" />Call {salon.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden border-b bg-card">
        {(salon as any)?.hero_image ? (
          <>
            <img src={(salon as any).hero_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        )}
        <div className={cn("relative max-w-4xl mx-auto px-6", (salon as any)?.hero_image ? "py-12 sm:py-16" : "py-8 sm:py-10")}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/25 flex items-center justify-center">
              <Scissors className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className={cn("font-display text-2xl sm:text-3xl font-bold tracking-tight", (salon as any)?.hero_image && "text-white")}>{salon?.name ?? "Book Your Appointment"}</h1>
              <div className="flex items-center gap-4 mt-1.5">
                {salon?.address && (
                  <span className={cn("flex items-center gap-1 text-sm", (salon as any)?.hero_image ? "text-white/80" : "text-muted-foreground")}>
                    <MapPin className="w-3.5 h-3.5" />{salon.address}
                  </span>
                )}
                {salon?.phone && (
                  <a href={`tel:${salon.phone}`} className={cn("flex items-center gap-1 text-sm transition-colors", (salon as any)?.hero_image ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-primary")}>
                    <Phone className="w-3.5 h-3.5" />{salon.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      {step !== "confirmed" && (
        <div className="bg-card/50 border-b backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {STEP_LIST.map((s, i) => {
                const isCompleted = currentStepIndex > i;
                const isActive = currentStepIndex === i;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                        isCompleted && "bg-primary text-primary-foreground shadow-md shadow-primary/25",
                        isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110",
                        !isCompleted && !isActive && "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={cn(
                        "text-sm font-medium hidden sm:block transition-colors",
                        (isActive || isCompleted) ? "text-foreground" : "text-muted-foreground"
                      )}>{s.label}</span>
                    </div>
                    {i < STEP_LIST.length - 1 && (
                      <div className="flex-1 mx-3">
                        <div className="h-0.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn(
                            "h-full bg-primary rounded-full transition-all duration-500",
                            isCompleted ? "w-full" : "w-0"
                          )} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Step: Services */}
        {step === "services" && (
          <div className="animate-fade-in space-y-8">
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
                What would you like<br />
                <span className="text-primary">today?</span>
              </h2>
              <p className="text-muted-foreground mt-3 text-lg">Browse our services and select the one that suits you.</p>
            </div>

            {Object.entries(groupedServices).map(([cat, svcs]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full bg-primary" />
                  <h3 className="text-base font-display font-bold uppercase tracking-wide">{cat}</h3>
                  <span className="text-xs text-muted-foreground ml-1">({svcs.length})</span>
                </div>
                <div className="grid gap-3">
                  {svcs.map((svc: any) => (
                    <button
                      key={svc.id}
                      onClick={() => { setSelectedService(svc); setStep("staff"); }}
                      className="group w-full flex items-center justify-between p-5 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Sparkles className="w-5 h-5 text-accent-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{svc.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />{svc.duration} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-xl font-bold text-primary">{currency}{svc.price.toLocaleString()}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {services?.length === 0 && (
              <div className="bg-card rounded-2xl border p-16 text-center">
                <Scissors className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No services available at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Staff */}
        {step === "staff" && (
          <div className="animate-fade-in space-y-8">
            <button onClick={() => setStep("services")} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to services
            </button>
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
                Choose your<br />
                <span className="text-primary">stylist</span>
              </h2>
              <p className="text-muted-foreground mt-3 text-lg">
                Pick your preferred professional for <span className="font-semibold text-foreground">{selectedService?.name}</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {staff?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => { setSelectedStaff(member); setStep("datetime"); }}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center text-2xl font-display font-bold text-primary group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-200">
                    {member.name.charAt(0)}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{member.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-warning text-warning" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Date & Time */}
        {step === "datetime" && (
          <div className="animate-fade-in space-y-8">
            <button onClick={() => setStep("staff")} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to stylists
            </button>
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
                Pick your<br />
                <span className="text-primary">perfect time</span>
              </h2>
              <p className="text-muted-foreground mt-3 text-lg">
                <span className="font-semibold text-foreground">{selectedService?.name}</span> with{" "}
                <span className="font-semibold text-foreground">{selectedStaff?.name}</span>
              </p>
            </div>

            {/* Floating summary pill */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{selectedService?.name}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{selectedService?.duration} min</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm font-bold text-primary">{currency}{selectedService?.price.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 bg-card rounded-2xl border p-5 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                  disabled={(date) => isBefore(date, addDays(new Date(), -1)) || date.getDay() === 0}
                  className="pointer-events-auto"
                />
              </div>
              <div className="lg:col-span-3">
                {selectedDate ? (
                  <div className="bg-card rounded-2xl border p-5">
                    <h4 className="font-display font-bold text-lg mb-4">{format(selectedDate, "EEEE, MMMM d")}</h4>
                    {timeSlots.length > 0 ? (
                      <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {timeSlots.map((slot) => {
                            const [h] = slot.split(":").map(Number);
                            const period = h < 12 ? "AM" : "PM";
                            const display12 = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${slot.split(":")[1]}`;
                            return (
                              <button
                                key={slot}
                                onClick={() => setSelectedTime(slot)}
                                className={cn(
                                  "py-3 px-3 rounded-xl border text-sm font-medium transition-all duration-200",
                                  selectedTime === slot
                                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25 scale-[1.02]"
                                    : "bg-card hover:border-primary/40 hover:shadow-sm"
                                )}
                              >
                                <span className="font-semibold">{display12}</span>
                                <span className="text-xs opacity-70 ml-1">{period}</span>
                              </button>
                            );
                          })}
                        </div>
                        {selectedTime && (
                          <Button className="w-full mt-5 h-12 text-base font-semibold rounded-xl shadow-md shadow-primary/20" onClick={() => setStep("details")}>
                            Continue to Details
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="py-12 text-center">
                        <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No available slots for this date.</p>
                        <p className="text-xs text-muted-foreground mt-1">Try selecting a different day.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl border p-5 flex flex-col items-center justify-center py-16">
                    <CalendarDays className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground font-medium">Select a date</p>
                    <p className="text-xs text-muted-foreground mt-1">Choose from the calendar to see available times</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step: Client details */}
        {step === "details" && (
          <div className="animate-fade-in space-y-8 max-w-lg mx-auto">
            <button onClick={() => setStep("datetime")} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to schedule
            </button>
            <div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
                Almost<br />
                <span className="text-primary">there!</span>
              </h2>
              <p className="text-muted-foreground mt-3 text-lg">Enter your details to confirm the booking.</p>
            </div>

            {/* Booking Summary Card */}
            <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-5 py-3 border-b">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Booking Summary</p>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Sparkles className="w-4 h-4" />Service</span>
                  <span className="font-semibold">{selectedService?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><User className="w-4 h-4" />Stylist</span>
                  <span className="font-semibold">{selectedStaff?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="w-4 h-4" />Date</span>
                  <span className="font-semibold">{selectedDate && format(selectedDate, "EEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />Time</span>
                  <span className="font-semibold">{selectedTime}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="font-semibold text-base">Total</span>
                  <span className="font-display text-2xl font-bold text-primary">{currency}{selectedService?.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-10 h-12 rounded-xl" placeholder="Full Name *" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-10 h-12 rounded-xl" placeholder="Phone Number *" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-10 h-12 rounded-xl" placeholder="Email (optional)" type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input className="pl-10 h-12 rounded-xl" placeholder="Special requests (optional)" value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
              </div>

              <Button
                className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
                disabled={!clientForm.name || !clientForm.phone || bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
              >
                {bookMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Booking...
                  </span>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">By booking, you agree to our cancellation policy.</p>
            </div>
          </div>
        )}

        {/* Step: Confirmed */}
        {step === "confirmed" && (
          <div className="animate-fade-in text-center py-12 sm:py-20 max-w-lg mx-auto">
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 rounded-3xl bg-success/15 flex items-center justify-center mx-auto">
                <Check className="w-12 h-12 text-success" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">You're all set!</h2>
            <p className="text-muted-foreground text-lg mb-8">Your appointment has been confirmed.</p>

            <div className="bg-card rounded-2xl border overflow-hidden text-left mb-8">
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-5 py-3 border-b">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Appointment Details</p>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold">{selectedService?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stylist</span>
                  <span className="font-semibold">{selectedStaff?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-semibold">{selectedDate && format(selectedDate, "EEE, MMM d")} at {selectedTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold">{selectedService?.duration} min</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="rounded-xl font-semibold shadow-md shadow-primary/20" onClick={resetBooking}>
                <CalendarDays className="w-4 h-4 mr-2" />Book Another
              </Button>
              {salon?.phone && (
                <Button variant="outline" size="lg" className="rounded-xl font-semibold" asChild>
                  <a href={`tel:${salon.phone}`}><Phone className="w-4 h-4 mr-2" />Call Salon</a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {salon?.name ?? "Salon"}</span>
          <span className="flex items-center gap-1">Powered by <Scissors className="w-3 h-3" /> SalonSync</span>
        </div>
      </footer>
    </div>
  );
}
