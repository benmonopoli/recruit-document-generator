import { supabase } from "@/integrations/supabase/client";
import type { Project, JobDescription, InterviewQuestion, TestTask, ApplicationQuestion, ChatMessage } from "@/types";

// Get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Projects
export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function fetchProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createProject(project: Partial<Project> & { visibility?: string; contributorIds?: string[] }): Promise<Project> {
  const userId = await getCurrentUserId();
  
  const visibility = project.visibility || 'private';
  const isPublic = visibility === 'public';
  
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: project.name || "Untitled Project",
      department: project.department,
      description: project.description,
      is_public: isPublic,
      visibility: visibility,
      source_template_id: project.source_template_id,
      created_by: userId,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Add contributors if provided
  if (project.contributorIds && project.contributorIds.length > 0) {
    const contributorInserts = project.contributorIds.map(contributorId => ({
      project_id: data.id,
      user_id: contributorId,
      added_by: userId,
    }));
    
    await supabase.from("project_contributors").insert(contributorInserts);
  }
  
  return data;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// Job Descriptions
export async function fetchJobDescriptions(projectId: string): Promise<JobDescription[]> {
  const { data, error } = await supabase
    .from("job_descriptions")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false });
  
  if (error) throw error;
  
  // Convert tone values from database (0-100) to UI scale (0-1)
  return (data || []).map(jd => ({
    ...jd,
    tone_formal_casual: jd.tone_formal_casual / 100,
    tone_serious_playful: jd.tone_serious_playful / 100,
    tone_concise_detailed: jd.tone_concise_detailed / 100,
    tone_traditional_unconventional: jd.tone_traditional_unconventional / 100,
  }));
}

export async function createJobDescription(jd: Partial<JobDescription> & { project_id: string }): Promise<JobDescription> {
  // Get the latest version for this project
  const { data: existingJds } = await supabase
    .from("job_descriptions")
    .select("version")
    .eq("project_id", jd.project_id)
    .order("version", { ascending: false })
    .limit(1);
  
  const nextVersion = existingJds && existingJds.length > 0 ? existingJds[0].version + 1 : 1;
  
  const { data, error } = await supabase
    .from("job_descriptions")
    .insert({
      project_id: jd.project_id,
      title: jd.title || "Untitled",
      content: jd.content || "",
      version: nextVersion,
      tone_formal_casual: jd.tone_formal_casual ?? 50,
      tone_serious_playful: jd.tone_serious_playful ?? 30,
      tone_concise_detailed: jd.tone_concise_detailed ?? 50,
      tone_traditional_unconventional: jd.tone_traditional_unconventional ?? 30,
      tone_preset: jd.tone_preset,
      generation_prompt: jd.generation_prompt,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateJobDescription(id: string, updates: Partial<JobDescription>): Promise<JobDescription> {
  const { data, error } = await supabase
    .from("job_descriptions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Interview Questions
export async function fetchInterviewQuestions(projectId: string): Promise<InterviewQuestion[]> {
  const { data, error } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createInterviewQuestion(q: Partial<InterviewQuestion> & { project_id: string }): Promise<InterviewQuestion> {
  const { data, error } = await supabase
    .from("interview_questions")
    .insert({
      project_id: q.project_id,
      question: q.question || "",
      question_type: q.question_type || "behavioral",
      stage: q.stage || "phone_screen",
      follow_ups: q.follow_ups,
      evaluation_criteria: q.evaluation_criteria,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteInterviewQuestion(id: string): Promise<void> {
  const { error } = await supabase
    .from("interview_questions")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// Test Tasks
export async function fetchTestTasks(projectId: string): Promise<TestTask[]> {
  const { data, error } = await supabase
    .from("test_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createTestTask(task: Partial<TestTask> & { project_id: string }): Promise<TestTask> {
  const { data, error } = await supabase
    .from("test_tasks")
    .insert({
      project_id: task.project_id,
      title: task.title || "Untitled Task",
      problem_statement: task.problem_statement || "",
      context_constraints: task.context_constraints,
      deliverables: task.deliverables,
      evaluation_criteria: task.evaluation_criteria,
      estimated_hours: task.estimated_hours ?? 4,
      difficulty_level: task.difficulty_level ?? 3,
      sample_solution: task.sample_solution,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTestTask(id: string, updates: Partial<TestTask>): Promise<TestTask> {
  const { data, error } = await supabase
    .from("test_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTestTask(id: string): Promise<void> {
  const { error } = await supabase
    .from("test_tasks")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// Application Questions
export async function fetchApplicationQuestions(projectId: string): Promise<ApplicationQuestion[]> {
  const { data, error } = await supabase
    .from("application_questions")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createApplicationQuestion(q: Partial<ApplicationQuestion> & { project_id: string }): Promise<ApplicationQuestion> {
  const { data, error } = await supabase
    .from("application_questions")
    .insert({
      project_id: q.project_id,
      question: q.question || "",
      purpose: q.purpose,
      field_type: q.field_type || "textarea",
      word_limit: q.word_limit,
      evaluation_notes: q.evaluation_notes,
      order_index: q.order_index ?? 0,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteApplicationQuestion(id: string): Promise<void> {
  const { error } = await supabase
    .from("application_questions")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// Chat Messages
export async function fetchChatMessages(projectId: string, sectionType?: string): Promise<ChatMessage[]> {
  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("project_id", projectId);
  
  if (sectionType) {
    query = query.eq("section_type", sectionType);
  }
  
  const { data, error } = await query.order("created_at", { ascending: true });
  
  if (error) throw error;
  return (data || []) as ChatMessage[];
}

export async function createChatMessage(msg: { project_id: string; role: string; content: string; section_type?: string }): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      project_id: msg.project_id,
      role: msg.role,
      content: msg.content,
      section_type: msg.section_type || "job_description",
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as ChatMessage;
}

export async function deleteChatMessages(projectId: string, sectionType: string): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("project_id", projectId)
    .eq("section_type", sectionType);
  
  if (error) throw error;
}

// Public Projects
export async function fetchPublicProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Clone project - optimized with parallel inserts
export async function cloneProject(sourceId: string, newName: string): Promise<Project> {
  const source = await fetchProject(sourceId);
  if (!source) throw new Error("Source project not found");

  const newProject = await createProject({
    name: newName,
    department: source.department,
    description: source.description,
    is_public: false,
    source_template_id: sourceId,
  });

  // Fetch all source data in parallel
  const [jds, questions, tasks, appQuestions] = await Promise.all([
    fetchJobDescriptions(sourceId),
    fetchInterviewQuestions(sourceId),
    fetchTestTasks(sourceId),
    fetchApplicationQuestions(sourceId),
  ]);

  // Clone all items in parallel for each category
  await Promise.all([
    // Clone job descriptions
    Promise.all(jds.map(jd => createJobDescription({
      project_id: newProject.id,
      title: jd.title,
      content: jd.content,
      // Convert back to 0-100 scale since fetchJobDescriptions returns 0-1 scale
      tone_formal_casual: Math.round(jd.tone_formal_casual * 100),
      tone_serious_playful: Math.round(jd.tone_serious_playful * 100),
      tone_concise_detailed: Math.round(jd.tone_concise_detailed * 100),
      tone_traditional_unconventional: Math.round(jd.tone_traditional_unconventional * 100),
      tone_preset: jd.tone_preset,
    }))),
    
    // Clone interview questions
    Promise.all(questions.map(q => createInterviewQuestion({
      project_id: newProject.id,
      question: q.question,
      question_type: q.question_type,
      stage: q.stage,
      follow_ups: q.follow_ups,
      evaluation_criteria: q.evaluation_criteria,
    }))),
    
    // Clone test tasks
    Promise.all(tasks.map(task => createTestTask({
      project_id: newProject.id,
      title: task.title,
      problem_statement: task.problem_statement,
      context_constraints: task.context_constraints,
      deliverables: task.deliverables,
      evaluation_criteria: task.evaluation_criteria,
      estimated_hours: task.estimated_hours,
      difficulty_level: task.difficulty_level,
    }))),
    
    // Clone application questions
    Promise.all(appQuestions.map(aq => createApplicationQuestion({
      project_id: newProject.id,
      question: aq.question,
      purpose: aq.purpose,
      field_type: aq.field_type,
      word_limit: aq.word_limit,
      evaluation_notes: aq.evaluation_notes,
      order_index: aq.order_index,
    }))),
  ]);

  return newProject;
}
