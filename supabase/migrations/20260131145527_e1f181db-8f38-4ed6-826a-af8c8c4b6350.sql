-- MCQ Test System Database Schema

-- Table 1: MCQ Tests (main test metadata)
CREATE TABLE public.mcq_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  topic_name TEXT,
  description TEXT,
  time_limit_mins INTEGER, -- NULL means no time limit
  test_mode TEXT NOT NULL DEFAULT 'practice' CHECK (test_mode IN ('practice', 'exam')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  result_visibility TEXT NOT NULL DEFAULT 'instant' CHECK (result_visibility IN ('instant', 'delayed', 'hidden')),
  retake_allowed BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 2: MCQ Questions
CREATE TABLE public.mcq_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.mcq_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  explanation TEXT,
  order_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 3: MCQ Options
CREATE TABLE public.mcq_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.mcq_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_label TEXT NOT NULL, -- A, B, C, D
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_number INTEGER NOT NULL DEFAULT 0
);

-- Table 4: MCQ Attempts (student test sessions)
CREATE TABLE public.mcq_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_id UUID NOT NULL REFERENCES public.mcq_tests(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score DECIMAL(5,2), -- percentage score
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_taken_secs INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Table 5: MCQ Responses (individual question answers)
CREATE TABLE public.mcq_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.mcq_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.mcq_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.mcq_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.mcq_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mcq_tests
CREATE POLICY "Anyone can view published tests" ON public.mcq_tests
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all tests" ON public.mcq_tests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mcq_questions
CREATE POLICY "Anyone can view questions of published tests" ON public.mcq_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mcq_tests WHERE id = test_id AND is_published = true)
  );

CREATE POLICY "Admins can manage questions" ON public.mcq_questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mcq_options (IMPORTANT: Hide is_correct until attempt is completed)
CREATE POLICY "Users can view options of published tests" ON public.mcq_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mcq_questions q
      JOIN public.mcq_tests t ON t.id = q.test_id
      WHERE q.id = question_id AND t.is_published = true
    )
  );

CREATE POLICY "Admins can manage options" ON public.mcq_options
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mcq_attempts
CREATE POLICY "Users can view own attempts" ON public.mcq_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts" ON public.mcq_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own in-progress attempts" ON public.mcq_attempts
  FOR UPDATE USING (auth.uid() = user_id AND status = 'in_progress');

CREATE POLICY "Admins can view all attempts" ON public.mcq_attempts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mcq_responses
CREATE POLICY "Users can view own responses" ON public.mcq_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mcq_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own responses" ON public.mcq_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.mcq_attempts WHERE id = attempt_id AND user_id = auth.uid() AND status = 'in_progress')
  );

CREATE POLICY "Users can update own responses during attempt" ON public.mcq_responses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.mcq_attempts WHERE id = attempt_id AND user_id = auth.uid() AND status = 'in_progress')
  );

CREATE POLICY "Admins can view all responses" ON public.mcq_responses
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_mcq_tests_subject ON public.mcq_tests(subject_id);
CREATE INDEX idx_mcq_tests_published ON public.mcq_tests(is_published);
CREATE INDEX idx_mcq_questions_test ON public.mcq_questions(test_id);
CREATE INDEX idx_mcq_options_question ON public.mcq_options(question_id);
CREATE INDEX idx_mcq_attempts_user ON public.mcq_attempts(user_id);
CREATE INDEX idx_mcq_attempts_test ON public.mcq_attempts(test_id);
CREATE INDEX idx_mcq_responses_attempt ON public.mcq_responses(attempt_id);

-- Trigger for updated_at on mcq_tests
CREATE TRIGGER update_mcq_tests_updated_at
  BEFORE UPDATE ON public.mcq_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Gamification: Award points when attempt is completed
CREATE OR REPLACE FUNCTION public.on_mcq_attempt_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Base points for completing a test
    PERFORM award_points(NEW.user_id, 'mcq_test_completed', 5, 'mcq_attempt', NEW.id);
    
    -- Bonus for 80%+ score
    IF NEW.score >= 80 THEN
      PERFORM award_points(NEW.user_id, 'mcq_high_score', 10, 'mcq_attempt', NEW.id);
    END IF;
    
    -- Bonus for perfect score
    IF NEW.score = 100 THEN
      PERFORM award_points(NEW.user_id, 'mcq_perfect_score', 20, 'mcq_attempt', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_mcq_attempt_complete_trigger
  AFTER UPDATE ON public.mcq_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.on_mcq_attempt_complete();