-- Drop overly permissive "Allow all access" policies that override proper RLS

-- company_knowledge
DROP POLICY IF EXISTS "Allow all access to company_knowledge" ON public.company_knowledge;

-- application_questions
DROP POLICY IF EXISTS "Allow all access to application_questions" ON public.application_questions;

-- chat_messages
DROP POLICY IF EXISTS "Allow all access to chat_messages" ON public.chat_messages;

-- greenhouse_jobs_cache
DROP POLICY IF EXISTS "Allow all access to greenhouse_jobs_cache" ON public.greenhouse_jobs_cache;

-- interview_questions
DROP POLICY IF EXISTS "Allow all access to interview_questions" ON public.interview_questions;

-- job_descriptions
DROP POLICY IF EXISTS "Allow all access to job_descriptions" ON public.job_descriptions;

-- projects
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;

-- test_tasks
DROP POLICY IF EXISTS "Allow all access to test_tasks" ON public.test_tasks;