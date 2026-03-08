import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export default function DangerZoneTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const resetAll = useMutation({
    mutationFn: async () => {
      const tables = [
        "sale_items", "sales", "inventory_usage", "purchase_orders",
        "consent_forms", "portfolio", "client_memberships", "appointments",
        "offpeak_offers", "commission_rules", "memberships",
        "inventory", "services", "staff", "clients", "salon_settings",
      ];
      for (const table of tables) {
        const { error } = await supabase.from(table as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      setConfirmText("");
      toast({ title: "All data has been reset", description: "Your salon data has been cleared." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="bg-card rounded-xl border border-destructive/30 p-6 space-y-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">Reset All Data</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This will permanently delete all your salon data including clients, staff, services, sales, inventory, appointments, memberships, and settings. This action cannot be undone.
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmText(""); }}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-1.5">
            <Trash2 className="w-4 h-4" />Delete All Data
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your salon data. Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input placeholder='Type "DELETE" to confirm' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <Button variant="destructive" className="w-full" disabled={confirmText !== "DELETE" || resetAll.isPending} onClick={() => resetAll.mutate()}>
            {resetAll.isPending ? "Deleting..." : "Permanently Delete All Data"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
