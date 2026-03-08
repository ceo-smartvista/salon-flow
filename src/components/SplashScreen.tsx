import { useEffect, useState } from "react";
import { Scissors, Shield } from "lucide-react";

interface SplashScreenProps {
  role: "admin" | "super_admin";
  onComplete: () => void;
}

export default function SplashScreen({ role, onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("hold"), 100);
    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    const doneTimer = setTimeout(onComplete, 2800);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  const isSuperAdmin = role === "super_admin";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated glow ring */}
      <div className="relative mb-8">
        <div
          className={`absolute inset-0 rounded-full blur-2xl transition-all duration-1000 ${
            phase === "enter" ? "scale-0 opacity-0" : "scale-150 opacity-30"
          } ${isSuperAdmin ? "bg-primary" : "bg-primary"}`}
        />
        <div
          className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-700 ${
            phase === "enter" ? "scale-0 rotate-180" : "scale-100 rotate-0"
          } ${isSuperAdmin ? "bg-primary" : "bg-primary"}`}
        >
          {isSuperAdmin ? (
            <Shield className="w-10 h-10 text-primary-foreground" />
          ) : (
            <Scissors className="w-10 h-10 text-primary-foreground" />
          )}
        </div>
      </div>

      {/* Title */}
      <h1
        className={`text-3xl font-bold tracking-tight text-foreground transition-all duration-700 delay-200 ${
          phase === "enter" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        SalonSync
      </h1>

      {/* Role badge */}
      <div
        className={`mt-3 px-4 py-1.5 rounded-full border text-sm font-medium transition-all duration-700 delay-400 ${
          phase === "enter" ? "opacity-0 scale-75" : "opacity-100 scale-100"
        } ${
          isSuperAdmin
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-primary/30 bg-primary/10 text-primary"
        }`}
      >
        {isSuperAdmin ? "Super Admin" : "Admin"}
      </div>

      {/* Welcome message */}
      <p
        className={`mt-4 text-muted-foreground text-sm transition-all duration-700 delay-500 ${
          phase === "enter" ? "opacity-0" : "opacity-100"
        }`}
      >
        {isSuperAdmin ? "Welcome back, Platform Manager" : "Welcome back"}
      </p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
