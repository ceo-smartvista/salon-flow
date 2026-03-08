import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, setHours, setMinutes, isBefore, addMinutes } from "date-fns";
import {
  Scissors, Clock, ChevronRight, Check, ArrowLeft,
  User, CalendarDays, MapPin, Phone, Mail, MessageSquare, Star,
  ShoppingBag, Plus, X, Sparkles, Heart, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import heroFallback from "@/assets/hero-salon.jpg";
import catHair from "@/assets/cat-hair.jpg";
import catSkin from "@/assets/cat-skin.jpg";
import catNails from "@/assets/cat-nails.jpg";
import catProducts from "@/assets/cat-products.jpg";

type Step = "browse" | "staff" | "datetime" | "details" | "confirmed";

const CATEGORY_IMAGES: Record<string, string> = {
  Hair: catHair,
  Skin: catSkin,
  Nails: catNails,
  Products: catProducts,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  Hair: "from-violet-600 to-purple-700",
  Skin: "from-rose-500 to-pink-600",
  Nails: "from-amber-500 to-orange-600",
  Products: "from-emerald-500 to-teal-600",
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
      const { data } = await supabase.from("appointments").select("start_time, end_time")
        .eq("staff_id", selectedStaff.id).gte("start_time", dayStart).lte("start_time", dayEnd).neq("status", "cancelled");
      return data ?? [];
    },
    enabled: !!selectedDate && !!selectedStaff,
  });

  const primaryService = selectedServices.find((s) => !s.is_product);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.is_product ? 0 : s.duration), 0);

  const bookMutation = useMutation({
    mutationFn: async () => {
      let clientId: string;
      const { data: existingClient } = await supabase.from("clients").select("id").eq("phone", clientForm.phone).limit(1).maybeSingle();
      if (existingClient) { clientId = existingClient.id; }
      else {
        const { data: newClient, error: clientErr } = await supabase.from("clients")
          .insert({ name: clientForm.name, phone: clientForm.phone, email: clientForm.email || null }).select("id").single();
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
          const aptStart = new Date(apt.start_time); const aptEnd = new Date(apt.end_time);
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
    setStep("browse"); setSelectedServices([]); setSelectedStaff(null);
    setSelectedDate(undefined); setSelectedTime(""); setClientForm({ name: "", phone: "", email: "", notes: "" });
    setActiveCategory("All");
  };

  const heroImage = (salon as any)?.hero_image || heroFallback;

  // ===== BOOKING DISABLED =====
  if (salon && !salon.online_booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6">
            <Scissors className="w-10 h-10 text-stone-400" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-3">Online Booking Unavailable</h1>
          <p className="text-stone-500 text-lg">This salon is not currently accepting online bookings.</p>
          {salon.phone && (
            <a href={`tel:${salon.phone}`} className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-colors">
              <Phone className="w-4 h-4" />Call {salon.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" style={{ colorScheme: "light" }}>
      {/* ===== HERO ===== */}
      <header className="relative h-[420px] sm:h-[480px] lg:h-[520px] overflow-hidden">
        <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        
        {/* Top bar */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/90 font-semibold text-lg tracking-tight">{salon?.name ?? "Salon"}</span>
            </div>
            {salon?.phone && (
              <a href={`tel:${salon.phone}`} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-medium hover:bg-white/25 transition-colors">
                <Phone className="w-3.5 h-3.5" />{salon.phone}
              </a>
            )}
          </div>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/90 text-xs font-medium tracking-wide uppercase">Open for Booking</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05] max-w-2xl">
              Your Beauty,{" "}
              <span className="bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">Our Passion</span>
            </h1>
            <p className="text-white/70 text-lg sm:text-xl mt-3 max-w-lg">
              Premium services tailored to perfection. Book your appointment in just a few clicks.
            </p>
            {salon?.address && (
              <div className="flex items-center gap-1.5 mt-4 text-white/60 text-sm">
                <MapPin className="w-3.5 h-3.5" />{salon.address}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== CATEGORY CARDS ===== */}
      {step === "browse" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {categories.filter(c => c !== "All").map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? "All" : cat)}
                className={cn(
                  "relative h-28 sm:h-32 rounded-2xl overflow-hidden group transition-all duration-300",
                  activeCategory === cat ? "ring-2 ring-stone-900 ring-offset-2 ring-offset-stone-50 shadow-xl scale-[1.02]" : "shadow-lg hover:shadow-xl hover:scale-[1.01]"
                )}
              >
                <img src={CATEGORY_IMAGES[cat] ?? catHair} alt={cat} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className={cn("absolute inset-0 bg-gradient-to-t opacity-80", CATEGORY_GRADIENTS[cat] ?? "from-stone-600 to-stone-800")} />
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                  <span className="text-lg sm:text-xl font-bold tracking-tight">{cat}</span>
                  <span className="text-white/70 text-xs mt-0.5">{services?.filter(s => s.category === cat).length ?? 0} services</span>
                </div>
                {activeCategory === cat && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center z-10">
                    <Check className="w-3.5 h-3.5 text-stone-900" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== BROWSE STEP ===== */}
      {step === "browse" && (
        <>
          {/* Filter pills */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border",
                      activeCategory === cat
                        ? "bg-stone-900 text-white border-stone-900 shadow-md"
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="text-sm text-stone-500 hidden sm:block">{filteredServices.length} services</span>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 lg:pb-12">
            <div className="flex gap-8">
              {/* Service grid */}
              <div className="flex-1 min-w-0">
                {filteredServices.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center shadow-sm">
                    <Scissors className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-stone-700">No services found</p>
                    <p className="text-stone-400 mt-1">Try selecting a different category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map((svc) => {
                      const selected = isSelected(svc.id);
                      const catImage = CATEGORY_IMAGES[svc.category] ?? catHair;
                      return (
                        <div
                          key={svc.id}
                          className={cn(
                            "group bg-white rounded-2xl overflow-hidden transition-all duration-300 border",
                            selected
                              ? "border-stone-900 shadow-xl ring-1 ring-stone-900/10"
                              : "border-stone-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                          )}
                        >
                          {/* Image */}
                          <div className="relative h-40 overflow-hidden">
                            <img src={catImage} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            
                            {svc.is_product && (
                              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-stone-700">Product</span>
                            )}
                            
                            {selected && (
                              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg animate-scale-in">
                                <Check className="w-4 h-4" />
                              </div>
                            )}

                            <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: selected ? "none" : undefined }}>
                              <Heart className="w-4 h-4 text-stone-500" />
                            </button>

                            {/* Price tag */}
                            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-white shadow-lg">
                              <span className="font-bold text-stone-900">{currency}{svc.price.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            <h3 className="font-semibold text-stone-900 text-[15px] leading-tight">{svc.name}</h3>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{svc.category}</span>
                              {!svc.is_product && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-stone-300" />
                                  <span className="flex items-center gap-1 text-xs text-stone-400">
                                    <Clock className="w-3 h-3" />{svc.duration} min
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                              ))}
                              <span className="text-xs text-stone-400 ml-1">5.0</span>
                            </div>

                            <button
                              onClick={() => toggleService(svc)}
                              className={cn(
                                "w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5",
                                selected
                                  ? "bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-600"
                                  : "bg-stone-900 text-white hover:bg-stone-800 shadow-sm"
                              )}
                            >
                              {selected ? <><X className="w-3.5 h-3.5" />Remove</> : <><Plus className="w-3.5 h-3.5" />Add to Booking</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop sidebar cart */}
              <div className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-6">
                  <CartPanel
                    selectedServices={selectedServices} currency={currency} cartTotal={cartTotal}
                    hasServices={hasServices} onRemove={(id) => setSelectedServices((prev) => prev.filter((s) => s.id !== id))}
                    onProceed={() => setStep("staff")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile bottom bar */}
          {selectedServices.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-xl border-t border-stone-200 p-4 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)]">
              <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                <div>
                  <p className="text-xs text-stone-500">{selectedServices.length} item{selectedServices.length > 1 ? "s" : ""}</p>
                  <p className="text-xl font-bold text-stone-900">{currency}{cartTotal.toLocaleString()}</p>
                </div>
                <Button
                  size="lg"
                  className="rounded-full font-bold text-base px-8 bg-stone-900 text-white hover:bg-stone-800 shadow-lg"
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
          <button onClick={() => setStep("browse")} className="flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-700 transition-colors group mb-8">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to services
          </button>

          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-xs font-semibold text-stone-600 uppercase tracking-wider mb-4">
              Step 2 of 4
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">Choose Your Expert</h2>
            <p className="text-stone-500 mt-2 text-lg">Select your preferred professional</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {staff?.map((member) => (
              <button
                key={member.id}
                onClick={() => { setSelectedStaff(member); setStep("datetime"); }}
                className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
              >
                {/* Avatar area */}
                <div className="h-32 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center relative">
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl font-bold text-stone-700 group-hover:scale-110 transition-transform duration-300">
                    {member.name.charAt(0)}
                  </div>
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-bold text-stone-900 text-lg">{member.name}</h3>
                  <p className="text-stone-500 text-sm mt-0.5">{member.role}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs text-stone-400 ml-1.5">5.0</span>
                  </div>
                  <div className="mt-4 py-2 rounded-xl bg-stone-50 text-sm font-medium text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                    Book with {member.name.split(" ")[0]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== DATETIME STEP ===== */}
      {step === "datetime" && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
          <button onClick={() => setStep("staff")} className="flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-700 transition-colors group mb-8">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to stylists
          </button>

          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-xs font-semibold text-stone-600 uppercase tracking-wider mb-4">
              Step 3 of 4
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">Pick Your Time</h2>
            <p className="text-stone-500 mt-2 text-lg">
              {primaryService?.name} with {selectedStaff?.name}
            </p>
          </div>

          {/* Selection pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {selectedServices.map((svc) => (
              <span key={svc.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 shadow-sm">
                <Check className="w-3 h-3 text-emerald-500" />{svc.name}
                <span className="text-stone-400">•</span>
                <span className="font-bold">{currency}{svc.price}</span>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 flex justify-center shadow-sm">
              <Calendar
                mode="single" selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                disabled={(date) => isBefore(date, addDays(new Date(), -1)) || date.getDay() === 0}
                className="pointer-events-auto"
              />
            </div>
            <div className="lg:col-span-3">
              {selectedDate ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                  <h4 className="font-bold text-stone-900 text-lg mb-4">{format(selectedDate, "EEEE, MMMM d")}</h4>
                  {timeSlots.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map((slot) => {
                          const [h] = slot.split(":").map(Number);
                          const period = h < 12 ? "AM" : "PM";
                          const display12 = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${slot.split(":")[1]}`;
                          return (
                            <button key={slot} onClick={() => setSelectedTime(slot)}
                              className={cn(
                                "py-3 px-3 rounded-xl border text-sm font-medium transition-all duration-200",
                                selectedTime === slot
                                  ? "bg-stone-900 text-white border-stone-900 shadow-md scale-[1.02]"
                                  : "bg-white border-stone-200 text-stone-700 hover:border-stone-400 hover:shadow-sm"
                              )}
                            >
                              <span className="font-semibold">{display12}</span>
                              <span className="text-xs opacity-60 ml-1">{period}</span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedTime && (
                        <Button className="w-full mt-5 h-12 text-base font-semibold rounded-xl bg-stone-900 hover:bg-stone-800 shadow-md" onClick={() => setStep("details")}>
                          Continue to Details <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <CalendarDays className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                      <p className="text-stone-500">No available slots for this date.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col items-center justify-center py-16 shadow-sm">
                  <CalendarDays className="w-10 h-10 text-stone-300 mb-3" />
                  <p className="text-stone-600 font-medium">Select a date</p>
                  <p className="text-xs text-stone-400 mt-1">Choose from the calendar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAILS STEP ===== */}
      {step === "details" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
          <button onClick={() => setStep("datetime")} className="flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-700 transition-colors group mb-8">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Back to schedule
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-xs font-semibold text-stone-600 uppercase tracking-wider mb-4">
                  Step 4 of 4
                </span>
                <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Complete Your Booking</h2>
                <p className="text-stone-500 mt-2">Enter your details to confirm the appointment.</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input className="w-full h-13 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-base placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all" placeholder="Full Name *" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input className="w-full h-13 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-base placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all" placeholder="Phone Number *" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input className="w-full h-13 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-base placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all" placeholder="Email (optional)" type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-3.5 w-4 h-4 text-stone-400" />
                  <input className="w-full h-13 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-base placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 transition-all" placeholder="Special requests (optional)" value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
                </div>
              </div>

              <button
                className="w-full h-14 rounded-xl bg-stone-900 text-white text-base font-bold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg flex items-center justify-center gap-2"
                disabled={!clientForm.name || !clientForm.phone || bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
              >
                {bookMutation.isPending ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Booking...</>
                ) : (
                  <>Confirm & Book • {currency}{cartTotal.toLocaleString()}</>
                )}
              </button>

              <div className="flex items-center justify-center gap-6 text-xs text-stone-400">
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />Secure booking</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" />Instant confirmation</span>
              </div>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden sticky top-6 shadow-sm">
                <div className="bg-stone-50 px-5 py-4 border-b border-stone-200">
                  <p className="text-sm font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />Order Summary
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  {selectedServices.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-stone-800">{svc.name}</p>
                        <p className="text-xs text-stone-400">{svc.category}{!svc.is_product && ` • ${svc.duration} min`}</p>
                      </div>
                      <span className="font-semibold text-stone-900">{currency}{svc.price.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t border-stone-100 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-stone-500">Stylist</span><span className="font-medium text-stone-800">{selectedStaff?.name}</span></div>
                    <div className="flex justify-between"><span className="text-stone-500">Date</span><span className="font-medium text-stone-800">{selectedDate && format(selectedDate, "EEE, MMM d")}</span></div>
                    <div className="flex justify-between"><span className="text-stone-500">Time</span><span className="font-medium text-stone-800">{selectedTime}</span></div>
                  </div>
                  <div className="border-t border-stone-200 pt-3 flex items-center justify-between">
                    <span className="font-bold text-stone-900">Total</span>
                    <span className="text-2xl font-bold text-stone-900">{currency}{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONFIRMED ===== */}
      {step === "confirmed" && (
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center animate-fade-in">
          <div className="relative inline-block mb-8">
            <div className="w-28 h-28 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <Check className="w-14 h-14 text-emerald-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center animate-bounce">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3">You're All Set!</h2>
          <p className="text-stone-500 text-lg mb-8">Your appointment has been confirmed. We look forward to seeing you!</p>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden text-left mb-8 shadow-sm">
            <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-600">Appointment Details</p>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {selectedServices.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between">
                  <span className="text-stone-500">{svc.name}</span>
                  <span className="font-semibold text-stone-900">{currency}{svc.price.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-stone-100 pt-3 space-y-2">
                <div className="flex justify-between"><span className="text-stone-500">Stylist</span><span className="font-semibold text-stone-900">{selectedStaff?.name}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Date & Time</span><span className="font-semibold text-stone-900">{selectedDate && format(selectedDate, "EEE, MMM d")} at {selectedTime}</span></div>
              </div>
              <div className="border-t border-stone-200 pt-3 flex justify-between">
                <span className="font-bold text-stone-900">Total</span>
                <span className="text-xl font-bold text-stone-900">{currency}{cartTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={resetBooking} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-colors shadow-md">
              <CalendarDays className="w-4 h-4" />Book Another
            </button>
            {salon?.phone && (
              <a href={`tel:${salon.phone}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition-colors">
                <Phone className="w-4 h-4" />Call Salon
              </a>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <span>© {new Date().getFullYear()} {salon?.name ?? "Salon"}. All rights reserved.</span>
          <span className="flex items-center gap-1.5">Powered by <Scissors className="w-3.5 h-3.5" /> <span className="font-semibold text-stone-600">SalonSync</span></span>
        </div>
      </footer>
    </div>
  );
}

/* ===== CART PANEL ===== */
function CartPanel({
  selectedServices, currency, cartTotal, hasServices, onRemove, onProceed,
}: {
  selectedServices: any[]; currency: string; cartTotal: number; hasServices: boolean;
  onRemove: (id: string) => void; onProceed: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
        <p className="font-bold text-stone-700 text-sm flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Your Booking
          <span className="ml-auto text-xs text-stone-400 font-normal">{selectedServices.length} item{selectedServices.length !== 1 ? "s" : ""}</span>
        </p>
      </div>

      {selectedServices.length === 0 ? (
        <div className="p-8 text-center">
          <ShoppingBag className="w-8 h-8 text-stone-200 mx-auto mb-3" />
          <p className="text-sm text-stone-500">Your cart is empty</p>
          <p className="text-xs text-stone-400 mt-1">Browse and add services</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {selectedServices.map((svc) => (
            <div key={svc.id} className="flex items-center gap-3 px-5 py-3 group">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <img src={CATEGORY_IMAGES[svc.category] ?? catHair} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 text-sm truncate">{svc.name}</p>
                <p className="text-xs text-stone-400">{svc.category}</p>
              </div>
              <span className="text-sm font-bold text-stone-900 whitespace-nowrap">{currency}{svc.price.toLocaleString()}</span>
              <button onClick={() => onRemove(svc.id)} className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <X className="w-3.5 h-3.5 text-stone-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedServices.length > 0 && (
        <div className="p-5 border-t border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-900">Total</span>
            <span className="text-xl font-bold text-stone-900">{currency}{cartTotal.toLocaleString()}</span>
          </div>
          <button
            className="w-full h-12 rounded-xl bg-stone-900 text-white text-base font-bold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md flex items-center justify-center gap-1.5"
            disabled={!hasServices}
            onClick={onProceed}
          >
            {hasServices ? <>Continue <ChevronRight className="w-4 h-4" /></> : "Add a service"}
          </button>
          {!hasServices && (
            <p className="text-xs text-center text-stone-400">Add at least one service (not just products) to book.</p>
          )}
        </div>
      )}
    </div>
  );
}
