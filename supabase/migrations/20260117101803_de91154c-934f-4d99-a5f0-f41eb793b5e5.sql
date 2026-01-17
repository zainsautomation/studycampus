-- Step 2.2: Tags & Better Organization
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.note_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view note_tags" ON public.note_tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage note_tags" ON public.note_tags FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 2.3: Note Version History
CREATE TABLE public.note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_url text,
  file_name text,
  file_type text,
  file_size integer,
  changes_description text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, version_number)
);

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions" ON public.note_versions FOR SELECT USING (true);
CREATE POLICY "Admins can manage versions" ON public.note_versions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 2.4: Recently Viewed Notes
CREATE TABLE public.note_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, note_id)
);

ALTER TABLE public.note_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own views" ON public.note_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own views" ON public.note_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own views" ON public.note_views FOR UPDATE USING (auth.uid() = user_id);

-- Step 3.1: Comment System for Q&A
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid NOT NULL,
  answer_id uuid REFERENCES public.answers(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users and admins can delete comments" ON public.comments FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Step 3.4: Mentions Foundation
CREATE TABLE public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id uuid NOT NULL,
  mentioned_by_user_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mentions" ON public.mentions FOR SELECT USING (auth.uid() = mentioned_user_id);
CREATE POLICY "Users can create mentions" ON public.mentions FOR INSERT WITH CHECK (auth.uid() = mentioned_by_user_id);
CREATE POLICY "Users can update own mentions" ON public.mentions FOR UPDATE USING (auth.uid() = mentioned_user_id);

-- Step 3.5: Post Categories
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category text DEFAULT 'discussion';