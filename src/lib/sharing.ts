import { supabase } from "@/integrations/supabase/client";
import type { ProjectContributor, SharedDocument, RegisteredUser } from "@/types";

// Get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Search for registered users by email (for adding contributors)
export async function searchUsersByEmail(email: string): Promise<RegisteredUser[]> {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action: "search_users", email },
  });
  
  if (error) throw error;
  return data?.users || [];
}

// Project Contributors
export async function fetchProjectContributors(projectId: string): Promise<ProjectContributor[]> {
  const { data, error } = await supabase
    .from("project_contributors")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  
  if (error) throw error;
  
  // Fetch user emails for display
  if (data && data.length > 0) {
    const userIds = data.map(c => c.user_id);
    const { data: usersData } = await supabase.functions.invoke("admin-users", {
      body: { action: "get_users_by_ids", userIds },
    });
    
    const emailMap = new Map(usersData?.users?.map((u: RegisteredUser) => [u.id, u.email]) || []);
    return data.map(c => ({
      ...c,
      user_email: emailMap.get(c.user_id) as string | undefined,
    }));
  }
  
  return data || [];
}

export async function addContributor(projectId: string, userId: string): Promise<ProjectContributor> {
  const addedBy = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from("project_contributors")
    .insert({
      project_id: projectId,
      user_id: userId,
      added_by: addedBy,
    })
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error("User is already a contributor");
    }
    throw error;
  }
  return data;
}

export async function removeContributor(contributorId: string): Promise<void> {
  const { error } = await supabase
    .from("project_contributors")
    .delete()
    .eq("id", contributorId);
  
  if (error) throw error;
}

// Shared Documents (Inbox)
export async function fetchInboxDocuments(): Promise<SharedDocument[]> {
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from("shared_documents")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  // Fetch sender emails for display
  if (data && data.length > 0) {
    const senderIds = [...new Set(data.map(d => d.sender_id))];
    const { data: usersData } = await supabase.functions.invoke("admin-users", {
      body: { action: "get_users_by_ids", userIds: senderIds },
    });
    
    const emailMap = new Map(usersData?.users?.map((u: RegisteredUser) => [u.id, u.email]) || []);
    return data.map(d => ({
      ...d,
      sender_email: emailMap.get(d.sender_id) as string | undefined,
    }));
  }
  
  return data || [];
}

export async function fetchUnreadInboxCount(): Promise<number> {
  const userId = await getCurrentUserId();
  
  const { count, error } = await supabase
    .from("shared_documents")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);
  
  if (error) throw error;
  return count || 0;
}

export async function shareDocument(
  recipientId: string,
  documentType: string,
  title: string,
  content: string,
  sourceProjectId?: string
): Promise<SharedDocument> {
  const senderId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from("shared_documents")
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      document_type: documentType,
      title,
      content,
      source_project_id: sourceProjectId || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function markInboxItemAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("shared_documents")
    .update({ is_read: true })
    .eq("id", id);
  
  if (error) throw error;
}

export async function deleteInboxItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("shared_documents")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// Fetch projects shared with me (where I'm a contributor)
export async function fetchSharedWithMeProjects(): Promise<string[]> {
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from("project_contributors")
    .select("project_id")
    .eq("user_id", userId);
  
  if (error) throw error;
  return data?.map(c => c.project_id) || [];
}
