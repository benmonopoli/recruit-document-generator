-- Add UPDATE policy for application_questions
CREATE POLICY "Users can update application questions of their projects"
ON public.application_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = application_questions.project_id
    AND (projects.created_by = auth.uid() OR projects.is_public = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = application_questions.project_id
    AND (projects.created_by = auth.uid() OR projects.is_public = true)
  )
);

-- Add UPDATE policy for interview_questions
CREATE POLICY "Users can update interview questions of their projects"
ON public.interview_questions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = interview_questions.project_id
    AND (projects.created_by = auth.uid() OR projects.is_public = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = interview_questions.project_id
    AND (projects.created_by = auth.uid() OR projects.is_public = true)
  )
);

-- Add DELETE policy for chat_messages (to allow clearing chat history)
CREATE POLICY "Users can delete chat messages of their projects"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = chat_messages.project_id
    AND projects.created_by = auth.uid()
  )
);