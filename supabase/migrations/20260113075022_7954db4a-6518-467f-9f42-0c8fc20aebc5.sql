-- First, change created_by column type from TEXT to UUID
ALTER TABLE public.projects 
  ALTER COLUMN created_by TYPE UUID USING created_by::UUID;

-- Now add the foreign key constraint
ALTER TABLE public.projects 
  ADD CONSTRAINT projects_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all read" ON public.projects;
DROP POLICY IF EXISTS "Allow all insert" ON public.projects;
DROP POLICY IF EXISTS "Allow all update" ON public.projects;
DROP POLICY IF EXISTS "Allow all delete" ON public.projects;

-- Create user-scoped RLS policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Drop existing permissive policies on job_descriptions
DROP POLICY IF EXISTS "Allow all read" ON public.job_descriptions;
DROP POLICY IF EXISTS "Allow all insert" ON public.job_descriptions;
DROP POLICY IF EXISTS "Allow all update" ON public.job_descriptions;
DROP POLICY IF EXISTS "Allow all delete" ON public.job_descriptions;

-- Create user-scoped RLS policies for job_descriptions (via project ownership)
CREATE POLICY "Users can view job descriptions of their projects"
  ON public.job_descriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = job_descriptions.project_id 
      AND (projects.created_by = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can create job descriptions for their projects"
  ON public.job_descriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = job_descriptions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update job descriptions of their projects"
  ON public.job_descriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = job_descriptions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete job descriptions of their projects"
  ON public.job_descriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = job_descriptions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Drop existing permissive policies on interview_questions
DROP POLICY IF EXISTS "Allow all read" ON public.interview_questions;
DROP POLICY IF EXISTS "Allow all insert" ON public.interview_questions;
DROP POLICY IF EXISTS "Allow all update" ON public.interview_questions;
DROP POLICY IF EXISTS "Allow all delete" ON public.interview_questions;

-- Create user-scoped RLS policies for interview_questions
CREATE POLICY "Users can view interview questions of their projects"
  ON public.interview_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = interview_questions.project_id 
      AND (projects.created_by = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can create interview questions for their projects"
  ON public.interview_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = interview_questions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete interview questions of their projects"
  ON public.interview_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = interview_questions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Drop existing permissive policies on test_tasks
DROP POLICY IF EXISTS "Allow all read" ON public.test_tasks;
DROP POLICY IF EXISTS "Allow all insert" ON public.test_tasks;
DROP POLICY IF EXISTS "Allow all update" ON public.test_tasks;
DROP POLICY IF EXISTS "Allow all delete" ON public.test_tasks;

-- Create user-scoped RLS policies for test_tasks
CREATE POLICY "Users can view test tasks of their projects"
  ON public.test_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = test_tasks.project_id 
      AND (projects.created_by = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can create test tasks for their projects"
  ON public.test_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = test_tasks.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update test tasks of their projects"
  ON public.test_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = test_tasks.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete test tasks of their projects"
  ON public.test_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = test_tasks.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Drop existing permissive policies on application_questions
DROP POLICY IF EXISTS "Allow all read" ON public.application_questions;
DROP POLICY IF EXISTS "Allow all insert" ON public.application_questions;
DROP POLICY IF EXISTS "Allow all update" ON public.application_questions;
DROP POLICY IF EXISTS "Allow all delete" ON public.application_questions;

-- Create user-scoped RLS policies for application_questions
CREATE POLICY "Users can view application questions of their projects"
  ON public.application_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = application_questions.project_id 
      AND (projects.created_by = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can create application questions for their projects"
  ON public.application_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = application_questions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete application questions of their projects"
  ON public.application_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = application_questions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Drop existing permissive policies on chat_messages
DROP POLICY IF EXISTS "Allow all read" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all insert" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all update" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all delete" ON public.chat_messages;

-- Create user-scoped RLS policies for chat_messages
CREATE POLICY "Users can view chat messages of their projects"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = chat_messages.project_id 
      AND (projects.created_by = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can create chat messages for their projects"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = chat_messages.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Greenhouse cache is shared across all users (read-only for users)
DROP POLICY IF EXISTS "Allow all read" ON public.greenhouse_jobs_cache;
DROP POLICY IF EXISTS "Allow all insert" ON public.greenhouse_jobs_cache;
DROP POLICY IF EXISTS "Allow all update" ON public.greenhouse_jobs_cache;
DROP POLICY IF EXISTS "Allow all delete" ON public.greenhouse_jobs_cache;

CREATE POLICY "Authenticated users can view greenhouse cache"
  ON public.greenhouse_jobs_cache FOR SELECT
  TO authenticated
  USING (true);

-- Company knowledge is shared across all users
DROP POLICY IF EXISTS "Allow all read" ON public.company_knowledge;
DROP POLICY IF EXISTS "Allow all insert" ON public.company_knowledge;
DROP POLICY IF EXISTS "Allow all update" ON public.company_knowledge;
DROP POLICY IF EXISTS "Allow all delete" ON public.company_knowledge;

CREATE POLICY "Authenticated users can view company knowledge"
  ON public.company_knowledge FOR SELECT
  TO authenticated
  USING (true);