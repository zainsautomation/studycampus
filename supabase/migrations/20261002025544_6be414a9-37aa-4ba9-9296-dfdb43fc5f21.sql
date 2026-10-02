CREATE TABLE public.gpa_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'My Result',
  student_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  semesters jsonb NOT NULL DEFAULT '[]'::jsonb,
  cgpa numeric(4,2) NOT NULL DEFAULT 0,
  total_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gpa_results TO authenticated;
GRANT ALL ON public.gpa_results TO service_role;
ALTER TABLE public.gpa_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own results" ON public.gpa_results FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own results" ON public.gpa_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own results" ON public.gpa_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own results" ON public.gpa_results FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX gpa_results_user_idx ON public.gpa_results(user_id, updated_at DESC);
CREATE TRIGGER update_gpa_results_updated_at BEFORE UPDATE ON public.gpa_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();