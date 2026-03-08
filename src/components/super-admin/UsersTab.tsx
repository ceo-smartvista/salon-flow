import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Shield, UserPlus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; userId: string; name: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["sa-all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["sa-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").upsert(
        { user_id: userId, role: role as any },
        { onConflict: "user_id,role" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-all-roles"] });
      toast({ title: "Role assigned successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-all-roles"] });
      toast({ title: "Role removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });

      if (error) {
        let message = error.message;
        const context = (error as any).context;

        if (context instanceof Response) {
          try {
            const parsed = await context.json();
            if (parsed?.error) message = parsed.error;
          } catch {
            // keep generic error message
          }
        }

        throw new Error(message);
      }

      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["sa-all-roles"] });
      setDeleteTarget(null);
      setConfirmText("");
      toast({ title: "User deleted successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const getUserRoles = (userId: string) => roles.filter(r => r.user_id === userId);

  const filteredProfiles = profiles.filter(p =>
    !search || p.display_name?.toLowerCase().includes(search.toLowerCase()) || p.user_id.includes(search)
  );

  const roleColors: Record<string, string> = {
    super_admin: "bg-primary/10 text-primary border-primary/30",
    admin: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    moderator: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    user: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="text-xs">
          {profiles.length} users
        </Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Assign Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filteredProfiles.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              filteredProfiles.map(profile => {
                const userRoles = getUserRoles(profile.user_id);
                const isSA = userRoles.some(r => r.role === "super_admin");
                return (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
                          {profile.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium">{profile.display_name || "Unnamed"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono max-w-[140px] truncate">
                      {profile.user_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.map(r => (
                          <Badge
                            key={r.id}
                            variant="outline"
                            className={`text-xs cursor-pointer hover:opacity-70 ${roleColors[r.role] || ""}`}
                            onClick={() => {
                              if (r.role === "super_admin") return;
                              removeRole.mutate({ userId: profile.user_id, role: r.role });
                            }}
                            title={r.role === "super_admin" ? "Cannot remove super_admin" : "Click to remove"}
                          >
                            {r.role}
                            {r.role !== "super_admin" && " ×"}
                          </Badge>
                        ))}
                        {userRoles.length === 0 && (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(profile.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        onValueChange={(role) => assignRole.mutate({ userId: profile.user_id, role })}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue placeholder="Add role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={isSA}
                        title={isSA ? "Cannot delete super admins" : "Delete user"}
                        onClick={() => setDeleteTarget({ id: profile.id, userId: profile.user_id, name: profile.display_name || "Unnamed" })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) { setDeleteTarget(null); setConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user "{deleteTarget?.name}"?</DialogTitle>
            <DialogDescription>
              This will permanently delete the user's account, profile, and all assigned roles. This action cannot be undone. Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder='Type "DELETE" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <Button
            variant="destructive"
            className="w-full"
            disabled={confirmText !== "DELETE" || deleteUser.isPending}
            onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.userId)}
          >
            {deleteUser.isPending ? "Deleting..." : "Permanently Delete User"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
