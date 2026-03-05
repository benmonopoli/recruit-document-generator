-- Create projects table for storing recruiting projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  source_template_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_descriptions table
CREATE TABLE public.job_descriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tone_formal_casual INTEGER NOT NULL DEFAULT 60,
  tone_serious_playful INTEGER NOT NULL DEFAULT 55,
  tone_concise_detailed INTEGER NOT NULL DEFAULT 50,
  tone_traditional_unconventional INTEGER NOT NULL DEFAULT 40,
  tone_preset TEXT DEFAULT 'company-standard',
  generation_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_questions table
CREATE TABLE public.interview_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- screening, technical, culture_fit, final
  question TEXT NOT NULL,
  question_type TEXT NOT NULL, -- behavioral, technical, situational
  follow_ups TEXT[],
  evaluation_criteria TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_tasks table
CREATE TABLE public.test_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  context_constraints TEXT,
  deliverables TEXT,
  evaluation_criteria TEXT,
  difficulty_level INTEGER NOT NULL DEFAULT 50,
  estimated_hours INTEGER NOT NULL DEFAULT 4,
  sample_solution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create application_questions table
CREATE TABLE public.application_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  purpose TEXT,
  word_limit INTEGER DEFAULT 200,
  field_type TEXT NOT NULL DEFAULT 'textarea', -- textarea, url, text
  evaluation_notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table for project conversations
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create greenhouse_jobs_cache table
CREATE TABLE public.greenhouse_jobs_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  department TEXT,
  location TEXT,
  remote_status TEXT,
  employment_type TEXT,
  status TEXT,
  created_date TEXT,
  closed_date TEXT,
  custom_fields JSONB,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_knowledge table for storing scraped/uploaded content
CREATE TABLE public.company_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- handbook, careers_page, about_page, blog_post
  content TEXT NOT NULL,
  source_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greenhouse_jobs_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS Policies: This is an internal tool with no auth, so allow all access
-- In production, you'd add IP whitelisting or simple password protection at the network level

CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to job_descriptions" ON public.job_descriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to interview_questions" ON public.interview_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to test_tasks" ON public.test_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to application_questions" ON public.application_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to greenhouse_jobs_cache" ON public.greenhouse_jobs_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to company_knowledge" ON public.company_knowledge FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();