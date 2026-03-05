-- Add section_type column to chat_messages to store chats per section
ALTER TABLE public.chat_messages 
ADD COLUMN section_type text DEFAULT 'job_description';

-- Create index for efficient querying
CREATE INDEX idx_chat_messages_project_section 
ON public.chat_messages(project_id, section_type);