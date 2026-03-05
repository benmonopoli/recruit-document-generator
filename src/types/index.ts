export interface Project {
  id: string;
  name: string;
  department: string | null;
  description: string | null;
  is_public: boolean;
  visibility: string; // 'private' | 'public'
  source_template_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectContributor {
  id: string;
  project_id: string;
  user_id: string;
  added_by: string;
  created_at: string;
  user_email?: string; // Joined from auth lookup
}

export interface SharedDocument {
  id: string;
  sender_id: string;
  recipient_id: string;
  document_type: string;
  title: string;
  content: string;
  source_project_id: string | null;
  is_read: boolean;
  created_at: string;
  sender_email?: string; // Joined from auth lookup
}

export interface JobDescription {
  id: string;
  project_id: string;
  title: string;
  content: string;
  version: number;
  tone_formal_casual: number;
  tone_serious_playful: number;
  tone_concise_detailed: number;
  tone_traditional_unconventional: number;
  tone_preset: string | null;
  generation_prompt: string | null;
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  project_id: string;
  question: string;
  question_type: string;
  stage: string;
  follow_ups: string[] | null;
  evaluation_criteria: string[] | null;
  created_at: string;
}

export interface TestTask {
  id: string;
  project_id: string;
  title: string;
  problem_statement: string;
  context_constraints: string | null;
  deliverables: string | null;
  evaluation_criteria: string | null;
  estimated_hours: number;
  difficulty_level: number;
  sample_solution: string | null;
  created_at: string;
}

export interface ApplicationQuestion {
  id: string;
  project_id: string;
  question: string;
  purpose: string | null;
  field_type: string;
  word_limit: number | null;
  evaluation_notes: string | null;
  order_index: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  section_type?: string;
  created_at: string;
}

export interface GreenhouseJob {
  id: string;
  title: string;
  status: string | null;
  department: string | null;
  location: string | null;
  description: string | null;
  requirements: string | null;
  employment_type: string | null;
  remote_status: string | null;
  created_date: string | null;
  closed_date: string | null;
  custom_fields: Record<string, unknown> | null;
  cached_at: string;
}

export interface CompanyKnowledge {
  id: string;
  content_type: string;
  content: string;
  source_url: string | null;
  updated_at: string;
}

export interface ToneSettings {
  formal_casual: number;
  serious_playful: number;
  concise_detailed: number;
  traditional_unconventional: number;
  preset?: string;
}

export type ContentType = "job_description" | "interview_questions" | "test_task" | "application_questions";

export interface CandidateContext {
  linkedInUrl?: string;
  linkedInAnalysis?: string;
  cvFilename?: string;
  cvAnalysis?: string;
}

export interface GenerationContext {
  projectName?: string;
  department?: string;
  tone?: ToneSettings;
  existingContent?: string;
  linkedInProfile?: string;
  greenhouseData?: GreenhouseJob;
  companyKnowledge?: string;
  jobDescriptionContent?: string; // Shared JD content for other sections
  sectionType?: ContentType;
  candidateContext?: CandidateContext;
}

export interface RegisteredUser {
  id: string;
  email: string;
}
