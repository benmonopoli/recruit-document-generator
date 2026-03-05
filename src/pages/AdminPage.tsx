import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Shield, UserPlus, Trash2, Users, ShieldCheck, ShieldX, Mail, Copy, LogOut, Clock, UserCheck, RefreshCw } from "lucide-react";
import { FeedbackList } from "@/components/FeedbackList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | "user" | null;
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, [user]);

  const checkAdminAndLoadUsers = async () => {
    if (!user) return;

    try {
      // Check if current user is admin using the has_role function
      const { data: roleData, error: roleError } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (roleError) throw roleError;

      if (!roleData) {
        toast.error("Access denied. Admin only.");
        navigate("/");
        return;
      }

      setIsAdmin(true);

      // Fetch all users via edge function (includes roles and sign-in info)
      const { data: usersData, error: usersError } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });

      if (usersError) throw usersError;

      if (usersData?.users) {
        setUsers(usersData.users);
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const addUserRole = async (email: string, role: "admin" | "user") => {
    setAddingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "add_role", email, role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Added ${role} role for ${email}`);
      setNewUserEmail("");
      checkAdminAndLoadUsers();
    } catch (error) {
      console.error("Error adding role:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add role");
    } finally {
      setAddingUser(false);
    }
  };

  const sendInvite = async (email: string, role: "admin" | "user" = "user") => {
    setSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "invite", email, role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Invite sent to ${email}!`);
      setInviteEmail("");
      checkAdminAndLoadUsers();
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const copySignupLink = () => {
    const signupUrl = `${window.location.origin}/auth`;
    navigator.clipboard.writeText(signupUrl);
    toast.success("Signup link copied to clipboard!");
  };

  const deleteUser = async (userId: string, email: string) => {
    if (userId === user?.id) {
      toast.error("You cannot delete your own account");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Deleted user ${email}`);
      checkAdminAndLoadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const toggleAdminRole = async (userId: string, currentRole: "admin" | "user" | null, email: string) => {
    if (userId === user?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    const newRole = currentRole === "admin" ? "user" : "admin";

    try {
      if (currentRole === null) {
        // User has no role, insert new one
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      } else {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);
        if (error) throw error;
      }

      toast.success(`Updated ${email} to ${newRole}`);
      checkAdminAndLoadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const signOutUser = async (userId: string, email: string) => {
    if (userId === user?.id) {
      toast.error("You cannot sign yourself out from here");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "sign_out_user", userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Signed out ${email}`);
      checkAdminAndLoadUsers();
    } catch (error) {
      console.error("Error signing out user:", error);
      toast.error("Failed to sign out user");
    }
  };

  // Helper to check if user is "recently active" (signed in within last 24 hours)
  const isRecentlyActive = (lastSignIn: string | null) => {
    if (!lastSignIn) return false;
    const lastSignInDate = new Date(lastSignIn);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastSignInDate > oneDayAgo;
  };

  const formatLastSignIn = (lastSignIn: string | null) => {
    if (!lastSignIn) return "Never";
    const date = new Date(lastSignIn);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage user access and roles</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              checkAdminAndLoadUsers();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Quick Actions - Combined into one card with tabs-like sections */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Add Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invite Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Invite new user</span>
                <span className="text-xs text-muted-foreground">— sends an email invitation</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="email"
                  placeholder="email@yourcompany.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 min-w-[200px] max-w-sm"
                />
                <Button
                  onClick={() => sendInvite(inviteEmail, "user")}
                  disabled={!inviteEmail || sendingInvite}
                  size="sm"
                >
                  {sendingInvite && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Send Invite
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => sendInvite(inviteEmail, "admin")}
                  disabled={!inviteEmail || sendingInvite}
                  size="sm"
                >
                  As Admin
                </Button>
              </div>
            </div>

            <div className="border-t" />

            {/* Grant Role Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Grant role to existing user</span>
                <span className="text-xs text-muted-foreground">— they must have an account</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="email"
                  placeholder="email@yourcompany.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="flex-1 min-w-[200px] max-w-sm"
                />
                <Button
                  onClick={() => addUserRole(newUserEmail, "user")}
                  disabled={!newUserEmail || addingUser}
                  size="sm"
                >
                  {addingUser && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Add User
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => addUserRole(newUserEmail, "admin")}
                  disabled={!newUserEmail || addingUser}
                  size="sm"
                >
                  As Admin
                </Button>
              </div>
            </div>

            <div className="border-t" />

            {/* Quick Link */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Or share the signup link directly</span>
              <Button variant="outline" size="sm" onClick={copySignupLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Signup Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                All Users
              </CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{users.length} total</span>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {users.filter(u => isRecentlyActive(u.last_sign_in_at)).length} online
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                No users registered yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <span className="font-medium">{u.email}</span>
                              <span className="text-xs text-muted-foreground">
                                Joined {new Date(u.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {u.id === user?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {u.role ? (
                              <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                {u.role}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">No role</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isRecentlyActive(u.last_sign_in_at) && (
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            )}
                            <span className={isRecentlyActive(u.last_sign_in_at) ? "text-foreground" : "text-muted-foreground"}>
                              {formatLastSignIn(u.last_sign_in_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleAdminRole(u.id, u.role, u.email)}
                              disabled={u.id === user?.id}
                              title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                            >
                              {u.role === "admin" ? (
                                <ShieldX className="h-4 w-4" />
                              ) : (
                                <ShieldCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => signOutUser(u.id, u.email)}
                              disabled={u.id === user?.id || !isRecentlyActive(u.last_sign_in_at)}
                              title="Sign out user"
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                            <AlertDialog 
                              open={userToDelete?.id === u.id} 
                              onOpenChange={(open) => {
                                if (!open) {
                                  setUserToDelete(null);
                                  setDeleteConfirmEmail("");
                                }
                              }}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={u.id === user?.id}
                                  title="Delete user account"
                                  onClick={() => setUserToDelete({ id: u.id, email: u.email })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete user account?</AlertDialogTitle>
                                  <AlertDialogDescription className="space-y-3">
                                    <span className="block">
                                      This will permanently delete <strong>{u.email}</strong>'s account. This cannot be undone.
                                    </span>
                                    <span className="block text-sm">
                                      Type the email to confirm:
                                    </span>
                                    <Input
                                      value={deleteConfirmEmail}
                                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                                      placeholder={u.email}
                                      className="mt-2"
                                    />
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => {
                                    setUserToDelete(null);
                                    setDeleteConfirmEmail("");
                                  }}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      deleteUser(u.id, u.email);
                                      setUserToDelete(null);
                                      setDeleteConfirmEmail("");
                                    }}
                                    disabled={deleteConfirmEmail !== u.email}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <FeedbackList />
      </div>
    </Layout>
  );
}