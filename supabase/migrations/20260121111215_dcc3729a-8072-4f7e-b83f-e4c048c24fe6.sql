-- Add visibility column to projects table
ALTER TABLE public.projects 
ADD COLUMN visibility text NOT NULL DEFAULT 'private' 
CHECK (visibility IN ('private', 'public'));

-- Migrate existing is_public to visibility
UPDATE public.projects SET visibility = 'public' WHERE is_public = true;

-- Create project_contributors table
CREATE TABLE public.project_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Enable RLS on project_contributors
ALTER TABLE public.project_contributors ENABLE ROW LEVEL SECURITY;

-- Contributors can view their own contributor records
CREATE POLICY "Users can view projects they contribute to"
ON public.project_contributors FOR SELECT
USING (user_id = auth.uid() OR added_by = auth.uid());

-- Project owners can manage contributors
CREATE POLICY "Project owners can add contributors"
ON public.project_contributors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Project owners can remove contributors"
ON public.project_contributors FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND created_by = auth.uid()
  )
);

-- Create shared_documents table (inbox)
CREATE TABLE public.shared_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  document_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  source_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on shared_documents
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

-- Recipients can view their inbox
CREATE POLICY "Users can view their inbox"
ON public.shared_documents FOR SELECT
USING (recipient_id = auth.uid() OR sender_id = auth.uid());

-- Users can share documents
CREATE POLICY "Users can share documents"
ON public.shared_documents FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Recipients can mark as read
CREATE POLICY "Recipients can update their inbox items"
ON public.shared_documents FOR UPDATE
USING (recipient_id = auth.uid());

-- Recipients can delete from their inbox
CREATE POLICY "Recipients can delete their inbox items"
ON public.shared_documents FOR DELETE
USING (recipient_id = auth.uid());

-- Update projects RLS to include contributors
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own or contributed projects"
ON public.projects FOR SELECT
USING (
  created_by = auth.uid() 
  OR visibility = 'public'
  OR EXISTS (
    SELECT 1 FROM public.project_contributors 
    WHERE project_id = id AND user_id = auth.uid()
  )
);

-- Contributors can update projects
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Owners and contributors can update projects"
ON public.projects FOR UPDATE
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.project_contributors 
    WHERE project_id = id AND user_id = auth.uid()
  )
);

-- Update related tables RLS to include contributors
-- Job descriptions
DROP POLICY IF EXISTS "Users can view job descriptions of their projects" ON public.job_descriptions;
CREATE POLICY "Users can view job descriptions of their projects"
ON public.job_descriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = job_descriptions.project_id 
    AND (
      created_by = auth.uid() 
      OR visibility = 'public'
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can create job descriptions for their projects" ON public.job_descriptions;
CREATE POLICY "Users can create job descriptions for their projects"
ON public.job_descriptions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = job_descriptions.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can update job descriptions of their projects" ON public.job_descriptions;
CREATE POLICY "Users can update job descriptions of their projects"
ON public.job_descriptions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = job_descriptions.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can delete job descriptions of their projects" ON public.job_descriptions;
CREATE POLICY "Users can delete job descriptions of their projects"
ON public.job_descriptions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = job_descriptions.project_id AND created_by = auth.uid()
  )
);

-- Interview questions - update policies
DROP POLICY IF EXISTS "Users can view interview questions of their projects" ON public.interview_questions;
CREATE POLICY "Users can view interview questions of their projects"
ON public.interview_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = interview_questions.project_id 
    AND (
      created_by = auth.uid() 
      OR visibility = 'public'
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can create interview questions for their projects" ON public.interview_questions;
CREATE POLICY "Users can create interview questions for their projects"
ON public.interview_questions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = interview_questions.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can update interview questions of their projects" ON public.interview_questions;
CREATE POLICY "Users can update interview questions of their projects"
ON public.interview_questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = interview_questions.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can delete interview questions of their projects" ON public.interview_questions;
CREATE POLICY "Users can delete interview questions of their projects"
ON public.interview_questions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = interview_questions.project_id AND created_by = auth.uid()
  )
);

-- Test tasks - update policies  
DROP POLICY IF EXISTS "Users can view test tasks of their projects" ON public.test_tasks;
CREATE POLICY "Users can view test tasks of their projects"
ON public.test_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = test_tasks.project_id 
    AND (
      created_by = auth.uid() 
      OR visibility = 'public'
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can create test tasks for their projects" ON public.test_tasks;
CREATE POLICY "Users can create test tasks for their projects"
ON public.test_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = test_tasks.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can update test tasks of their projects" ON public.test_tasks;
CREATE POLICY "Users can update test tasks of their projects"
ON public.test_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = test_tasks.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can delete test tasks of their projects" ON public.test_tasks;
CREATE POLICY "Users can delete test tasks of their projects"
ON public.test_tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = test_tasks.project_id AND created_by = auth.uid()
  )
);

-- Application questions - update policies
DROP POLICY IF EXISTS "Users can view application questions of their projects" ON public.application_questions;
CREATE POLICY "Users can view application questions of their projects"
ON public.application_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = application_questions.project_id 
    AND (
      created_by = auth.uid() 
      OR visibility = 'public'
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can create application questions for their projects" ON public.application_questions;
CREATE POLICY "Users can create application questions for their projects"
ON public.application_questions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = application_questions.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can update application questions of their projects" ON public.application_questions;
CREATE POLICY "Users can update application questions of their projects"
ON public.application_questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = application_questions.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can delete application questions of their projects" ON public.application_questions;
CREATE POLICY "Users can delete application questions of their projects"
ON public.application_questions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = application_questions.project_id AND created_by = auth.uid()
  )
);

-- Chat messages - update policies
DROP POLICY IF EXISTS "Users can view chat messages of their projects" ON public.chat_messages;
CREATE POLICY "Users can view chat messages of their projects"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = chat_messages.project_id 
    AND (
      created_by = auth.uid() 
      OR visibility = 'public'
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can create chat messages for their projects" ON public.chat_messages;
CREATE POLICY "Users can create chat messages for their projects"
ON public.chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = chat_messages.project_id 
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.project_contributors WHERE project_id = projects.id AND user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users can delete chat messages of their projects" ON public.chat_messages;
CREATE POLICY "Users can delete chat messages of their projects"
ON public.chat_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = chat_messages.project_id AND created_by = auth.uid()
  )
);