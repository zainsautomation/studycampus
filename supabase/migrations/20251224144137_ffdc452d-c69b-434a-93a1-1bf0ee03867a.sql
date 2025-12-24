-- Add link_url column to notes table for external resource links
ALTER TABLE public.notes ADD COLUMN link_url text DEFAULT NULL;