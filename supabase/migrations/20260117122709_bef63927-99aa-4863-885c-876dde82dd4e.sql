-- Fix function search paths
ALTER FUNCTION public.calculate_level(integer) SET search_path = public;
ALTER FUNCTION public.get_rank_title(integer) SET search_path = public;

-- Fix overly permissive RLS policies by replacing with proper ones
DROP POLICY IF EXISTS "System can manage points" ON public.user_points;
DROP POLICY IF EXISTS "System can insert transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "System can manage user achievements" ON public.user_achievements;

-- user_points: users can only view, system handles inserts via SECURITY DEFINER functions
CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all points" ON public.user_points FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- point_transactions: handled via SECURITY DEFINER function, no direct insert policy needed

-- user_achievements: users can view all (for leaderboard), managed via triggers
CREATE POLICY "Admins can manage achievements" ON public.user_achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));