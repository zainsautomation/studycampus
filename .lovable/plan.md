

# MCQ Result Visibility -- Audit and Improvements

## Current State

The system has three result visibility modes: `instant`, `delayed`, and `hidden`.

**Issues found:**

1. **"Delayed" mode has no reveal mechanism.** It currently behaves identically to "instant" -- students can see correct answers immediately after submission. There is no admin-controlled toggle to reveal results later. This defeats the purpose of "delayed" visibility.

2. **Score is always visible.** Even in "hidden" mode, the score percentage, correct/incorrect count are shown. Only the answer review is hidden. This may be intentional but could be improved with clearer distinction.

3. **No "score only" mode.** There's no option to show score but hide correct answers -- which is what "delayed" should do before reveal.

4. **The "delayed" badge on test info page says "Answers hidden"** only for hidden mode. Delayed mode has no badge explaining when answers will be available.

---

## Plan

### 1. Add `results_revealed` column to `mcq_tests`

Add a boolean column `results_revealed` (default `false`) to `mcq_tests`. This controls whether "delayed" mode tests show the review tab.

- `instant`: Always show review (ignore `results_revealed`)
- `delayed`: Show review only when `results_revealed = true`; otherwise show score only with a message "Answers will be revealed by the instructor"
- `hidden`: Never show review

### 2. Update MCQResult page logic

Change line 136 from:
```
const showReview = test?.result_visibility === 'instant' || test?.result_visibility === 'delayed';
```
To:
```
const showReview = test?.result_visibility === 'instant' || 
  (test?.result_visibility === 'delayed' && test?.results_revealed === true);
```

Add an info banner when `delayed` and not yet revealed: "The instructor will reveal correct answers later."

### 3. Add "Reveal Results" toggle in Admin ManageMCQ

Add a new dropdown menu item for tests with `result_visibility === 'delayed'`:
- "Reveal Answers" / "Hide Answers" toggle that updates `results_revealed`
- Show a badge on delayed tests indicating revealed/unrevealed status

### 4. Update MCQTest info page

- Add a badge for delayed mode: "Answers revealed later" or "Answers available" depending on `results_revealed`
- Keep existing badges for instant/hidden

### 5. Update MCQCreationWizard

- Add helper text under the "Delayed" option explaining: "Score shown immediately, correct answers revealed by you later"
- Reset `results_revealed` to `false` when creating a new test

---

## Technical Details

### Database Migration
```sql
ALTER TABLE mcq_tests 
ADD COLUMN results_revealed boolean NOT NULL DEFAULT false;
```

### Files to modify:
1. **New migration** -- Add `results_revealed` column
2. **`src/pages/MCQResult.tsx`** -- Update `showReview` logic, add "answers not yet revealed" banner
3. **`src/pages/MCQTest.tsx`** -- Update badges for delayed mode
4. **`src/pages/admin/ManageMCQ.tsx`** -- Add "Reveal/Hide Answers" action in dropdown
5. **`src/hooks/useMCQAttempt.tsx`** -- Add `results_revealed` to `MCQTest` interface
6. **`src/components/admin/MCQCreationWizard.tsx`** -- Add helper description text for delayed mode

