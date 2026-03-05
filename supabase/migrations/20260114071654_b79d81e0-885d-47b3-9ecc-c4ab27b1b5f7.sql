-- Create user_settings table for preferences
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Appearance
    theme TEXT NOT NULL DEFAULT 'system',
    ui_density TEXT NOT NULL DEFAULT 'comfortable',
    
    -- Content Defaults
    default_tone_preset TEXT DEFAULT 'company-standard',
    preferred_writing_style INTEGER NOT NULL DEFAULT 50,
    default_department TEXT,
    
    -- Account
    display_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();