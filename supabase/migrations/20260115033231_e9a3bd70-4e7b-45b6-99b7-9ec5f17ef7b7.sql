-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  page_url TEXT,
  user_email TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can submit their own feedback
CREATE POLICY "Users can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update feedback (mark as read)
CREATE POLICY "Admins can update feedback"
  ON public.feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
  ON public.feedback
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Index for faster admin queries
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_is_read ON public.feedback(is_read) WHERE is_read = false;