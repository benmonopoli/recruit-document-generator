import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the user's JWT from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user using their token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Service client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Non-admin actions (available to all authenticated users)
    if (action === "search_users") {
      const { email } = body;
      if (!email || email.length < 3) {
        return new Response(JSON.stringify({ users: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) throw listError;

      // Filter users by email (case insensitive partial match)
      const matchingUsers = authUsers.users
        .filter(u => u.email?.toLowerCase().includes(email.toLowerCase()))
        .filter(u => u.id !== user.id) // Exclude current user
        .slice(0, 10) // Limit results
        .map(u => ({
          id: u.id,
          email: u.email,
        }));

      return new Response(JSON.stringify({ users: matchingUsers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_users_by_ids") {
      const { userIds } = body;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return new Response(JSON.stringify({ users: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) throw listError;

      const userIdSet = new Set(userIds);
      const matchingUsers = authUsers.users
        .filter(u => userIdSet.has(u.id))
        .map(u => ({
          id: u.id,
          email: u.email,
        }));

      return new Response(JSON.stringify({ users: matchingUsers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin-only actions below
    const { data: isAdmin, error: roleError } = await userClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied. Admin only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, userId } = body;

    switch (action) {
      case "list": {
        // List all users with their roles and sign-in info
        const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
        if (listError) throw listError;

        // Fetch all roles
        const { data: rolesData } = await adminClient
          .from("user_roles")
          .select("user_id, role");

        const roleMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

        const users = authUsers.users.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: roleMap.get(u.id) || null,
        }));

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sign_out_user": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Sign out user by invalidating their sessions
        const { error: signOutError } = await adminClient.auth.admin.signOut(userId);
        if (signOutError) throw signOutError;

        return new Response(JSON.stringify({ success: true, message: "User signed out" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Prevent deleting yourself
        if (userId === user.id) {
          return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete user's role first (if any)
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Delete user's settings (if any)
        await adminClient
          .from("user_settings")
          .delete()
          .eq("user_id", userId);

        // Delete the user account
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "add_role": {
        if (!email || !role) {
          return new Response(JSON.stringify({ error: "Email and role required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find user by email
        const { data: authUsers, error: findError } = await adminClient.auth.admin.listUsers();
        if (findError) throw findError;

        const targetUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!targetUser) {
          return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if role already exists
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("*")
          .eq("user_id", targetUser.id)
          .single();

        if (existingRole) {
          // Update existing role
          const { error: updateError } = await adminClient
            .from("user_roles")
            .update({ role })
            .eq("user_id", targetUser.id);

          if (updateError) throw updateError;
        } else {
          // Insert new role
          const { error: insertError } = await adminClient
            .from("user_roles")
            .insert({ user_id: targetUser.id, role });

          if (insertError) throw insertError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "invite": {
        if (!email) {
          return new Response(JSON.stringify({ error: "Email required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user already exists
        const { data: authUsers, error: findError } = await adminClient.auth.admin.listUsers();
        if (findError) throw findError;

        const existingUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          return new Response(JSON.stringify({ error: "User already has an account. Use 'Grant Access' instead." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Send invite email via Supabase Auth
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${req.headers.get("origin") || "https://recruitdocumentgenerator.lovable.app"}/auth`,
        });

        if (inviteError) throw inviteError;

        // Optionally pre-assign a role for when they accept the invite
        if (role && inviteData.user) {
          await adminClient
            .from("user_roles")
            .insert({ user_id: inviteData.user.id, role });
        }

        return new Response(JSON.stringify({ success: true, message: "Invite sent!" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    console.error("Admin users error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});