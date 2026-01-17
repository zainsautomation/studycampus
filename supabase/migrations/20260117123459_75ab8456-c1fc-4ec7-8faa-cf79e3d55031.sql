-- Content moderation queue for reported content
CREATE TABLE public.moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reported_by uuid,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- Admin activity log for accountability
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Moderation queue policies
CREATE POLICY "Users can report content" ON public.moderation_queue 
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can view moderation queue" ON public.moderation_queue 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update moderation queue" ON public.moderation_queue 
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete from moderation queue" ON public.moderation_queue 
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin logs policies  
CREATE POLICY "Admins can view logs" ON public.admin_logs 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs" ON public.admin_logs 
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));