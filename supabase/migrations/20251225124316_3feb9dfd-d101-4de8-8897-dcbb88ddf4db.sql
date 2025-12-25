-- Create saved_notes table for bookmark functionality
CREATE TABLE public.saved_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, note_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_notes ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved notes
CREATE POLICY "Users can view own saved notes"
ON public.saved_notes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save notes
CREATE POLICY "Users can save notes"
ON public.saved_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unsave notes
CREATE POLICY "Users can unsave notes"
ON public.saved_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_saved_notes_user_id ON public.saved_notes(user_id);
CREATE INDEX idx_saved_notes_note_id ON public.saved_notes(note_id);