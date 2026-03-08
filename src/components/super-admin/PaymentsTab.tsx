import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function PaymentsTab() {
  const { data: payments = [] } = useQuery({
    queryKey: ["sa-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_payments").select("*, tenants(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Total collected: ₹{(totalRevenue / 100).toLocaleString()}</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No payments recorded</TableCell></TableRow>
            ) : (
              payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{p.tenants?.name || "—"}</TableCell>
                  <TableCell className="font-semibold text-primary">₹{((p.amount || 0) / 100).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(p.period_start), "dd MMM")} → {format(new Date(p.period_end), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.notes || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
