"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import { createClient } from "@/lib/supabase/client";
import { showSuccessToast, showErrorToast } from "@/lib/toast";
import { useAuth, type UserRole } from "@/components/providers/auth-provider";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  User,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface UserWithProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; color: string; icon: React.ReactNode }
> = {
  user: {
    label: "User",
    color:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    icon: <User className="h-3 w-3" />,
  },
  admin: {
    label: "Admin",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    icon: <Shield className="h-3 w-3" />,
  },
  super_admin: {
    label: "Super Admin",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
};

export function UserManagementDialog({
  open,
  onOpenChange,
}: UserManagementDialogProps) {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        // Placeholder mode - generate fake users
        setUsers([
          {
            id: "1",
            email: "superadmin@example.com",
            full_name: "Super Admin",
            role: "super_admin",
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            email: "admin@example.com",
            full_name: "Admin User",
            role: "admin",
            created_at: new Date().toISOString(),
          },
          {
            id: "3",
            email: "user@example.com",
            full_name: "Regular User",
            role: "user",
            created_at: new Date().toISOString(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      showErrorToast(error, "Gagal memuat daftar pengguna");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // Prevent changing own role
    if (userId === userProfile?.id) {
      showErrorToast(null, "Tidak dapat mengubah role diri sendiri");
      return;
    }

    setUpdatingUserId(userId);
    try {
      const supabase = createClient();
      if (!supabase) {
        // Placeholder mode
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
        );
        showSuccessToast("Role berhasil diubah (Demo Mode)");
        setUpdatingUserId(null);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      showSuccessToast("Role berhasil diubah");
    } catch (error) {
      console.error("Error updating role:", error);
      showErrorToast(error, "Gagal mengubah role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kelola Pengguna
          </DialogTitle>
          <DialogDescription>
            Ubah role pengguna yang terdaftar dalam sistem.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner text="Memuat pengguna..." />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p>Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead className="w-40">Ubah Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role];
                  const isCurrentUser = user.id === userProfile?.id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "-"}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Anda
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`gap-1 ${roleConfig.color}`}
                          variant="secondary"
                        >
                          {roleConfig.icon}
                          {roleConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        {isCurrentUser ? (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              handleRoleChange(user.id, value as UserRole)
                            }
                            disabled={updatingUserId === user.id}
                          >
                            <SelectTrigger className="h-8 w-full">
                              {updatingUserId === user.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">
                                Super Admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">Keterangan Role:</p>
          <ul className="space-y-1">
            <li>
              <span className="font-medium text-foreground">User:</span> Hanya
              dapat melihat dan mengekspor data
            </li>
            <li>
              <span className="font-medium text-foreground">Admin:</span> Dapat
              membuat, mengubah, dan menghapus data
            </li>
            <li>
              <span className="font-medium text-foreground">Super Admin:</span>{" "}
              Semua akses Admin + mengelola role pengguna
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
