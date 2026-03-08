import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, setHours, setMinutes, isBefore, addMinutes } from "date-fns";
import {
  Scissors, Clock, ChevronRight, Check, ArrowLeft, Sparkles,
  User, CalendarDays, MapPin, Phone, Mail, MessageSquare, Star,
  ShoppingBag, Plus, Minus, X, Heart, Zap, Crown, Gem, Palette,
  HandMetal, Droplets, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "browse" | "staff" | "datetime" | "details" | "confirmed";

const CATEGORY_ICONS: Record<string, typeof Scissors> = {
  Hair: Scissors,
  Skin: Droplets,
  Nails: Palette,
  Products: Package,
};

const CATEGORY_COLORS: Record<string, string> = {
  Hair: "from-violet-500/20 to-purple-500/20 border-violet-500/20",
  Skin: "from-rose-500/20 to-pink-500/20 border-rose-500/20",
  Nails: "from-amber-500/20 to-orange-500/20 border-amber-500/20",
  Products: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20",
};

const CATEGORY_ACCENTS: Record<string, string> = {
  Hair: "text-violet-600 dark:text-violet-400",
  Skin: "text-rose-600 dark:text-rose-400",
  Nails: "text-amber-600 dark:text-amber-400",
  Products: "text-emerald-600 dark:text-emerald-400",
};

export default function BookingPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("browse");
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientForm, setClientForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cartOpen, setCartOpen] = useState(false);

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
      const { data } = await supabase.from("services").select("*").eq("active", true).order("category").order("name");
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

  const primaryService = selectedServices.find((s) => !s.is_product);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.is_product ? 0 : s.duration), 0);

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
      if (primaryService) {
        const startTime = new Date(selectedDate!);
        const [h, m] = selectedTime.split(":").map(Number);
        startTime.setHours(h, m, 0, 0);
        const endTime = addMinutes(startTime, totalDuration || primaryService.duration);
        const { error } = await supabase.from("appointments").insert({
          client_id: clientId, service_id: primaryService.id, staff_id: selectedStaff.id,
          start_time: startTime.toISOString(), end_time: endTime.toISOString(),
          notes: clientForm.notes || null, status: "confirmed",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => setStep("confirmed"),
    onError: (e: any) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
  });

  const timeSlots = useMemo(() => {
    if (!selectedDate || !primaryService) return [];
    const slots: string[] = [];
    const now = new Date();
    const dur = totalDuration || primaryService.duration;
    for (let hour = 9; hour < 19; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = setMinutes(setHours(new Date(selectedDate), hour), min);
        const slotEnd = addMinutes(slotStart, dur);
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
  }, [selectedDate, primaryService, totalDuration, existingAppointments]);

  const categories = useMemo(() => {
    const cats = [...new Set(services?.map((s) => s.category) ?? [])];
    return ["All", ...cats];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (activeCategory === "All") return services ?? [];
    return services?.filter((s) => s.category === activeCategory) ?? [];
  }, [services, activeCategory]);

  const currency = salon?.currency === "USD" ? "$" : salon?.currency === "GBP" ? "£" : "₹";
  const cartTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const hasServices = selectedServices.some((s) => !s.is_product);

  const toggleService = (svc: any) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      if (exists) return prev.filter((s) => s.id !== svc.id);
      return [...prev, svc];
    });
  };

  const isSelected = (id: string) => selectedServices.some((s) => s.id === id);

  const resetBooking = () => {
    setStep("browse");
    setSelectedServices([]);
    setSelectedStaff(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setClientForm({ name: "", phone: "", email: "", notes: "" });
    setActiveCategory("All");
    setCartOpen(false);
  };

  if (salon && !salon.online_booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Scissors className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Online Booking Unavailable</h1>
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
      {/* ===== HERO ===== */}
      <header className="relative overflow-hidden">
        {(salon as any)?.hero_image ? (
          <>
            <img src={(salon as any).hero_image} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8" />
        )}
        <div className={cn(
          "relative max-w-6xl mx-auto px-4 sm:px-6",
          (salon as any)?.hero_image ? "pt-16 pb-20 sm:pt-20 sm:pb-28" : "pt-10 pb-14 sm:pt-14 sm:pb-20"
        )}>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/20 mb-5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className={cn("text-xs font-semibold tracking-wide", (salon as any)?.hero_image ? "text-white/90" : "text-primary")}>BOOK ONLINE • INSTANT CONFIRMATION</span>
            </div>
            <h1 className={cn(
              "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]",
              (salon as any)?.hero_image ? "text-white" : "text-foreground"
            )}>
              {salon?.name ?? "Book Your Appointment"}
            </h1>
            <p className={cn(
              "text-lg sm:text-xl mt-4 max-w-lg",
              (salon as any)?.hero_image ? "text-white/75" : "text-muted-foreground"
            )}>
              Premium beauty services crafted just for you. Browse, select, and book in minutes.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6">
              {salon?.address && (
                <span className={cn("flex items-center gap-1.5 text-sm", (salon as any)?.hero_image ? "text-white/70" : "text-muted-foreground")}>
                  <MapPin className="w-4 h-4" />{salon.address}
                </span>
              )}
              {salon?.phone && (
                <a href={`tel:${salon.phone}`} className={cn("flex items-center gap-1.5 text-sm transition-colors", (salon as any)?.hero_image ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-primary")}>
                  <Phone className="w-4 h-4" />{salon.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== BROWSE STEP ===== */}
      {step === "browse" && (
        <>
          {/* Sticky nav bar */}
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between h-14">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
                  {categories.map((cat) => {
                    const Icon = cat === "All" ? Sparkles : CATEGORY_ICONS[cat] ?? Sparkles;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                          activeCategory === cat
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Cart button */}
                <button
                  onClick={() => setCartOpen(!cartOpen)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-card border hover:border-primary/40 transition-colors ml-3"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-sm font-semibold">{currency}{cartTotal.toLocaleString()}</span>
                  {selectedServices.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                      {selectedServices.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex gap-8">
              {/* Main grid */}
              <div className="flex-1 min-w-0">
                {filteredServices.length === 0 ? (
                  <div className="bg-card rounded-2xl border p-16 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold">No items found</p>
                    <p className="text-muted-foreground mt-1">Try selecting a different category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map((svc) => {
                      const selected = isSelected(svc.id);
                      const CatIcon = CATEGORY_ICONS[svc.category] ?? Sparkles;
                      const colorClass = CATEGORY_COLORS[svc.category] ?? "from-primary/20 to-accent/20 border-primary/20";
                      const accentClass = CATEGORY_ACCENTS[svc.category] ?? "text-primary";
                      return (
                        <div
                          key={svc.id}
                          className={cn(
                            "group relative bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                            selected && "ring-2 ring-primary border-primary shadow-lg shadow-primary/10"
                          )}
                        >
                          {/* Colored top bar */}
                          <div className={cn("h-24 bg-gradient-to-br flex items-center justify-center relative", colorClass)}>
                            <CatIcon className={cn("w-10 h-10 opacity-40", accentClass)} />
                            {svc.is_product && (
                              <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-foreground">Product</span>
                            )}
                            {selected && (
                              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                                <Check className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="font-semibold text-sm leading-tight">{svc.name}</p>
                                <span className={cn("text-[11px] font-semibold uppercase tracking-wider mt-1 inline-block", accentClass)}>{svc.category}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                              {!svc.is_product && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />{svc.duration} min
                                </span>
                              )}
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className="w-2.5 h-2.5 fill-warning text-warning" />
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xl font-bold text-foreground">{currency}{svc.price.toLocaleString()}</span>
                              <button
                                onClick={() => toggleService(svc)}
                                className={cn(
                                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                                  selected
                                    ? "bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive"
                                    : "bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20"
                                )}
                              >
                                {selected ? (
                                  <><X className="w-3.5 h-3.5" />Remove</>
                                ) : (
                                  <><Plus className="w-3.5 h-3.5" />Add</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop sidebar cart */}
              <div className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-20">
                  <CartPanel
                    selectedServices={selectedServices}
                    currency={currency}
                    cartTotal={cartTotal}
                    hasServices={hasServices}
                    onRemove={(id) => setSelectedServices((prev) => prev.filter((s) => s.id !== id))}
                    onProceed={() => setStep("staff")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile bottom bar */}
          {selectedServices.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-xl border-t p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                <div>
                  <p className="text-xs text-muted-foreground">{selectedServices.length} item{selectedServices.length > 1 ? "s" : ""} selected</p>
                  <p className="text-xl font-bold">{currency}{cartTotal.toLocaleString()}</p>
                </div>
                <Button
                  size="lg"
                  className="rounded-xl font-bold text-base px-8 shadow-lg shadow-primary/25"
                  disabled={!hasServices}
                  onClick={() => setStep("staff")}
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== STAFF STEP ===== */}
      {step === "staff" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <button onClick={() => setStep("browse")} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group mb-6">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to services
          </button>

          <StepHeader
            title="Choose your stylist"
            subtitle={`For ${selectedServices.map((s) => s.name).join(", ")}`}
            icon={Crown}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
            {staff?.map((member) => (
              <button
                key={member.id}
                onClick={() => { setSelectedStaff(member); setStep("datetime"); }}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center text-3xl font-bold text-primary group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-200">
                  {member.name.charAt(0)}
                </div>
                <div className="text-center">
                  <p className="font-semibold group-hover:text-primary transition-colors">{member.name}</p>
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

      {/* ===== DATETIME STEP ===== */}
      {step === "datetime" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <button onClick={() => setStep("staff")} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group mb-6">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to stylists
          </button>

          <StepHeader
            title="Pick your perfect time"
            subtitle={`${primaryService?.name} with ${selectedStaff?.name} • ${totalDuration || primaryService?.duration} min`}
            icon={CalendarDays}
          />

          {/* Mini summary pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {selectedServices.map((svc) => (
              <span key={svc.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium">
                <Check className="w-3 h-3 text-primary" />{svc.name}
                <span className="text-muted-foreground">•</span>
                <span className="font-bold text-primary">{currency}{svc.price}</span>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
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
                  <h4 className="font-bold text-lg mb-4">{format(selectedDate, "EEEE, MMMM d")}</h4>
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
                          Continue to Details <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No available slots for this date.</p>
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

      {/* ===== DETAILS STEP ===== */}
      {step === "details" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <button onClick={() => setStep("datetime")} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group mb-6">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to schedule
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <StepHeader title="Complete your booking" subtitle="Enter your details to confirm." icon={User} />

              <div className="space-y-4 mt-6">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-11 h-13 rounded-xl text-base" placeholder="Full Name *" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-11 h-13 rounded-xl text-base" placeholder="Phone Number *" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-11 h-13 rounded-xl text-base" placeholder="Email (optional)" type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-11 h-13 rounded-xl text-base" placeholder="Special requests (optional)" value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
                </div>
              </div>

              <Button
                className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25 mt-4"
                disabled={!clientForm.name || !clientForm.phone || bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
              >
                {bookMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Booking...
                  </span>
                ) : (
                  <>Confirm & Book • {currency}{cartTotal.toLocaleString()}</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">By booking, you agree to our cancellation policy.</p>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border overflow-hidden sticky top-20">
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-5 py-4 border-b">
                  <p className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />Order Summary
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  {selectedServices.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">{svc.category}{!svc.is_product && ` • ${svc.duration} min`}</p>
                      </div>
                      <span className="font-semibold">{currency}{svc.price.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground"><User className="w-4 h-4" />Stylist</span>
                      <span className="font-medium">{selectedStaff?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="w-4 h-4" />Date</span>
                      <span className="font-medium">{selectedDate && format(selectedDate, "EEE, MMM d")}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" />Time</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="font-bold text-base">Total</span>
                    <span className="text-2xl font-bold text-primary">{currency}{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONFIRMED ===== */}
      {step === "confirmed" && (
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="relative inline-block mb-8">
            <div className="w-28 h-28 rounded-3xl bg-emerald-500/15 flex items-center justify-center mx-auto">
              <Check className="w-14 h-14 text-emerald-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-3">You're all set!</h2>
          <p className="text-muted-foreground text-lg mb-8">Your appointment has been confirmed.</p>

          <div className="bg-card rounded-2xl border overflow-hidden text-left mb-8">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-5 py-3 border-b">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Appointment Details</p>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {selectedServices.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{svc.name}</span>
                  <span className="font-semibold">{currency}{svc.price.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stylist</span>
                  <span className="font-semibold">{selectedStaff?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-semibold">{selectedDate && format(selectedDate, "EEE, MMM d")} at {selectedTime}</span>
                </div>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-primary">{currency}{cartTotal.toLocaleString()}</span>
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

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {salon?.name ?? "Salon"}. All rights reserved.</span>
          <span className="flex items-center gap-1.5">Powered by <Scissors className="w-3.5 h-3.5" /> <span className="font-semibold text-foreground">SalonSync</span></span>
        </div>
      </footer>

      {/* Mobile cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t p-6 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <CartPanel
              selectedServices={selectedServices}
              currency={currency}
              cartTotal={cartTotal}
              hasServices={hasServices}
              onRemove={(id) => setSelectedServices((prev) => prev.filter((s) => s.id !== id))}
              onProceed={() => { setCartOpen(false); setStep("staff"); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Sub-components ===== */

function StepHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: typeof Scissors }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-2 text-lg">{subtitle}</p>
    </div>
  );
}

function CartPanel({
  selectedServices, currency, cartTotal, hasServices, onRemove, onProceed,
}: {
  selectedServices: any[]; currency: string; cartTotal: number; hasServices: boolean;
  onRemove: (id: string) => void; onProceed: () => void;
}) {
  return (
    <div className="bg-card rounded-2xl border overflow-hidden">
      <div className="px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <p className="font-bold flex items-center gap-2 text-sm">
          <ShoppingBag className="w-4 h-4 text-primary" />
          Your Selection
          <span className="ml-auto text-xs text-muted-foreground">{selectedServices.length} item{selectedServices.length !== 1 ? "s" : ""}</span>
        </p>
      </div>

      {selectedServices.length === 0 ? (
        <div className="p-8 text-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Your cart is empty</p>
          <p className="text-xs text-muted-foreground mt-1">Browse services & products to add</p>
        </div>
      ) : (
        <div className="divide-y">
          {selectedServices.map((svc) => (
            <div key={svc.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{svc.name}</p>
                <p className="text-xs text-muted-foreground">{svc.category}{!svc.is_product && ` • ${svc.duration} min`}</p>
              </div>
              <span className="text-sm font-bold whitespace-nowrap">{currency}{svc.price.toLocaleString()}</span>
              <button onClick={() => onRemove(svc.id)} className="w-7 h-7 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedServices.length > 0 && (
        <div className="p-5 border-t space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold">Total</span>
            <span className="text-xl font-bold text-primary">{currency}{cartTotal.toLocaleString()}</span>
          </div>
          <Button
            className="w-full h-12 text-base font-bold rounded-xl shadow-md shadow-primary/20"
            disabled={!hasServices}
            onClick={onProceed}
          >
            {hasServices ? (
              <>Continue to Stylist <ChevronRight className="w-4 h-4 ml-1" /></>
            ) : (
              "Add a service to continue"
            )}
          </Button>
          {!hasServices && (
            <p className="text-xs text-center text-muted-foreground">You need at least one service (not just products) to book.</p>
          )}
        </div>
      )}
    </div>
  );
}
