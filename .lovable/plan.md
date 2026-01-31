
# MCQs Test System - Implementation Plan

## Overview

This plan outlines building a comprehensive MCQs (Multiple Choice Questions) test system for StudyCampus. The system will allow students to practice subject-based tests, while admins can easily create tests via smart copy-paste detection or PDF parsing using AI.

---

## Phase 1: Database Design

### New Tables Required

```text
+------------------+     +------------------+     +------------------+
|   mcq_tests      |---->|  mcq_questions   |---->|   mcq_options    |
+------------------+     +------------------+     +------------------+
| id               |     | id               |     | id               |
| subject_id (FK)  |     | test_id (FK)     |     | question_id (FK) |
| title            |     | question_text    |     | option_text      |
| topic_name       |     | order_number     |     | option_label     |
| description      |     | explanation      |     | is_correct       |
| time_limit_mins  |     | created_at       |     | order_number     |
| test_mode        |     +------------------+     +------------------+
| is_published     |
| shuffle_questions|            +------------------+
| shuffle_options  |            |   mcq_attempts   |
| result_visibility|            +------------------+
| retake_allowed   |            | id               |
| created_by       |            | user_id (FK)     |
| created_at       |            | test_id (FK)     |
+------------------+            | started_at       |
                                | completed_at     |
                                | score            |
                                | total_questions  |
                                | correct_answers  |
                                | time_taken_secs  |
                                | status           |
                                +------------------+
                                        |
                                        v
                                +------------------+
                                | mcq_responses    |
                                +------------------+
                                | id               |
                                | attempt_id (FK)  |
                                | question_id (FK) |
                                | selected_option  |
                                | is_correct       |
                                | answered_at      |
                                +------------------+
```

### RLS Policies
- Students can view published tests
- Students can create/view their own attempts
- Admins have full CRUD access to all MCQ tables

---

## Phase 2: Student-Facing Features

### Page: `/mcq` - MCQs Home
- Subject selection grid (reusing existing subjects table)
- Shows available test count per subject
- Modern card-based UI matching existing Notes design

### Page: `/mcq/subject/:subjectId` - Tests List
- Display test cards with:
  - Test title and topic name
  - Total questions count
  - Time limit badge (if set)
  - Test mode badge (Practice/Exam)
  - Attempt history summary

### Page: `/mcq/test/:testId` - Test Details
- Test information overview
- Start test button
- Previous attempt history (if any)
- Retake restrictions display

### Page: `/mcq/attempt/:attemptId` - Active Test
- Question display (single question or list view - mobile optimized)
- Options with clear selection UI
- Timer display (if timed test)
- Progress indicator (e.g., "5 of 20")
- Navigation between questions
- Auto-save answers on selection
- Submit confirmation dialog

### Page: `/mcq/result/:attemptId` - Results
- Score summary with percentage
- Correct/Incorrect count with visual indicators
- Time taken display
- Question-by-question review (based on result_visibility setting):
  - Show user's answer
  - Show correct answer (if allowed)
  - Show explanation (if provided)
- Retake option (if allowed)

---

## Phase 3: Admin Features

### Admin Page: `/admin/mcq` - Manage MCQ Tests
- List all tests with filters (subject, status, mode)
- Test stats (attempts count, average score)
- Create/Edit/Delete tests
- Publish/Unpublish toggle
- Bulk actions support

### Admin Test Creation Wizard
**Step 1: Test Details**
- Subject selection (from existing subjects)
- Test title and topic name
- Description (optional)
- Time limit (optional)
- Test mode (Practice/Exam)
- Result visibility (Instant/Delayed/Hidden)
- Shuffle questions toggle
- Shuffle options toggle
- Allow retakes toggle

**Step 2: Add Questions (3 Methods)**

#### Method A: Manual Entry
- Add questions one by one
- Question text input
- 4 options (A/B/C/D) with correct answer selection
- Optional explanation field

#### Method B: Smart Copy-Paste (AI-Powered)
- Large text area for pasting MCQs
- Uses Lovable AI to parse and detect:
  - Questions
  - Options (A/B/C/D or 1/2/3/4)
  - Correct answers (whether inline, at bottom, or in text)
- Preview parsed results before saving
- Manual correction interface for parsed data

#### Method C: PDF Upload (AI-Powered)
- Drag & drop PDF upload
- Uses Lovable AI to:
  - Extract text from PDF
  - Parse MCQ structure
  - Identify answers (even if on separate pages)
- Preview and correction interface

**Step 3: Review & Publish**
- Preview all questions
- Reorder questions (drag & drop)
- Edit individual questions
- Publish or save as draft

---

## Phase 4: AI Integration for MCQ Parsing

### Edge Function: `parse-mcq-text`
- Receives raw text input
- Uses Lovable AI (google/gemini-3-flash-preview) to:
  - Identify question boundaries
  - Extract options
  - Detect correct answers using multiple patterns
- Returns structured JSON with parsed MCQs

### Edge Function: `parse-mcq-pdf`
- Receives PDF file (base64)
- Uses pdf.js for text extraction
- Sends extracted text to Lovable AI for parsing
- Returns structured MCQ data

### AI Prompt Strategy
The AI will be instructed to detect various answer formats:
- "Answer: B"
- "Correct: Random Access Memory"
- Asterisk marking (A)*
- Bold/highlighted text patterns
- Answer key at document end

---

## Phase 5: Gamification Integration

### Points System
Integrate with existing gamification:
- Complete a test: +5 points
- Score 80%+: +10 bonus points
- Perfect score: +20 bonus points
- First attempt bonus: +3 points

### Database Function
- `on_mcq_attempt_complete()` trigger to award points

---

## Technical Implementation Details

### New Files to Create

**Pages:**
- `src/pages/MCQ.tsx` - Main MCQ home
- `src/pages/MCQSubject.tsx` - Tests by subject
- `src/pages/MCQTest.tsx` - Test details
- `src/pages/MCQAttempt.tsx` - Active test taking
- `src/pages/MCQResult.tsx` - Results view
- `src/pages/admin/ManageMCQ.tsx` - Admin management

**Components:**
- `src/components/mcq/TestCard.tsx` - Test card display
- `src/components/mcq/QuestionDisplay.tsx` - Question renderer
- `src/components/mcq/OptionButton.tsx` - Option selection
- `src/components/mcq/TestTimer.tsx` - Countdown timer
- `src/components/mcq/ProgressBar.tsx` - Test progress
- `src/components/mcq/ResultSummary.tsx` - Score display
- `src/components/mcq/QuestionReview.tsx` - Answer review
- `src/components/admin/MCQCreationWizard.tsx` - Multi-step form
- `src/components/admin/MCQTextParser.tsx` - Copy-paste interface
- `src/components/admin/MCQPDFUploader.tsx` - PDF upload
- `src/components/admin/MCQPreviewEditor.tsx` - Parsed preview

**Edge Functions:**
- `supabase/functions/parse-mcq-text/index.ts`
- `supabase/functions/parse-mcq-pdf/index.ts`

**Hooks:**
- `src/hooks/useMCQAttempt.tsx` - Manage active test state
- `src/hooks/useMCQTimer.tsx` - Timer logic

### Navigation Updates
- Add "MCQ Tests" to BottomNav (replace or add alongside existing items)
- Add MCQ section to Admin Sidebar under "Content"
- Add MCQ link to More page menu

---

## UI/UX Design Principles

1. **Dark mode first** - Matching existing theme
2. **Mobile-first layout** - Touch-friendly options, swipe navigation
3. **Card-based design** - Consistent with Notes/Q&A pages
4. **Smooth animations** - Using Framer Motion (existing)
5. **Clear typography** - Easy to read questions
6. **Accessibility** - Proper focus states, ARIA labels
7. **Progress feedback** - Timer, progress bar, auto-save indicator

---

## Security Considerations

1. **RLS Policies** - Prevent answer leakage before submission
2. **Timer enforcement** - Server-side validation for timed tests
3. **Anti-cheating** - Tab visibility detection (optional)
4. **Rate limiting** - Prevent rapid retakes

---

## Migration Order

1. Create database tables and RLS policies
2. Create student-facing pages (basic version)
3. Create admin management pages
4. Implement AI parsing edge functions
5. Add gamification integration
6. Polish UI and add advanced features

---

## Questions for Clarification

Before implementation, I'd like to confirm a few things:

1. **Navigation placement**: Should MCQ Tests get its own spot in the bottom navigation bar (replacing one item), or should it be accessible from the "More" menu?

2. **Subjects sharing**: Should MCQ tests use the existing subjects table (same subjects as Notes), or create separate MCQ-specific topics?

3. **Result visibility options**:
   - "Instant" = Show results immediately after submit
   - "Delayed" = Admin reveals results later
   - "Hidden" = Never show correct answers
   Is this what you had in mind?

4. **PDF parsing priority**: Should PDF upload be in the initial release, or can it be added as a Phase 2 enhancement (since it's more complex)?
