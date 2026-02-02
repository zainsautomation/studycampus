
# Comprehensive Bug Fixes and Enhancements Plan

## Issues Identified

### 1. PDF MCQ Parser - Edge Function Error
**Root Cause**: The `pdf-parse` library imported from `esm.sh` is not compatible with Deno Edge Runtime. The error "Failed to send a request to the Edge Function" with 500 status indicates the function crashes during initialization.

**Solution**: Replace `pdf-parse` with a Deno-native PDF text extraction approach using Mozilla's pdf.js via esm.sh with proper Deno-compatible configuration.

---

### 2. Q&A Toggle Feature (On/Off)
**Current State**: The `qa_enabled` setting exists in `useAppSettings.tsx` and the Admin Sidebar already has the toggle UI implemented. However, the Q&A page (`src/pages/QandA.tsx`) does NOT check this setting and always shows the Q&A content.

**Solution**: Add disabled state handling to `QandA.tsx` similar to how `Posts.tsx` handles it with `PostsDisabledBanner`. Create `QandADisabledBanner` component.

---

### 3. MCQ Timer - 0% Score on Time Up
**Root Cause**: In `MCQAttempt.tsx`, the `handleTimeUp` callback has a stale closure issue:
```javascript
const handleTimeUp = useCallback(() => {
  toast.warning('Time is up!');
  handleSubmit();  // Uses stale 'answers' state
}, []);  // Empty dependency array!
```

When time runs out, `handleSubmit()` uses the `answers` state from when the callback was created (empty `{}`), not the current answers.

**Solution**: 
1. Fix the dependency array: `[handleSubmit]` or inline the logic
2. Use a ref to track current answers to avoid stale closures

---

### 4. Practice vs Exam Mode Time Up Behavior
**Current Behavior**: Both modes auto-submit when time is up.
**Expected Behavior**: 
- Practice Mode: Show dialog "Time's up! Continue or Submit?"
- Exam Mode: Auto-submit immediately

**Solution**: Check `test.test_mode` in `handleTimeUp` and show a dialog for practice mode with options to continue or submit.

---

### 5. Achievement Points - Duplicate Points Issue
**Analysis**: The point system trigger `on_post_like_insert` awards 1 point per like correctly. The `award_points` function properly inserts into `point_transactions` table. 

However, the function doesn't check for duplicate likes - if a user unlikes and re-likes, they could potentially generate multiple point transactions.

**Solution**: Add duplicate prevention by checking if points were already awarded for this specific reference (post_id + liker combination).

---

## Implementation Plan

### Task 1: Fix PDF Parser Edge Function

**File**: `supabase/functions/parse-mcq-pdf/index.ts`

Replace the incompatible `pdf-parse` with a simpler approach that sends the PDF directly to the AI gateway which can handle base64 PDFs:

```text
Changes:
- Remove pdf-parse import (not Deno-compatible)
- Send PDF base64 directly to AI model that supports document/image understanding
- Use Gemini's native PDF handling capability
```

---

### Task 2: Add Q&A Disabled State

**New File**: `src/components/qa/QandADisabledBanner.tsx`
```tsx
// Similar to PostsDisabledBanner but for Q&A
Alert with message "Q&A is currently disabled by administrator"
```

**File**: `src/pages/QandA.tsx`
```text
Changes:
- Import useAppSettings hook (already imported)
- Add qaEnabled from useAppSettings
- Add early return with disabled banner if !qaEnabled
```

---

### Task 3: Fix MCQ Timer Score Bug

**File**: `src/pages/MCQAttempt.tsx`

```text
Changes:
- Use useRef to track current answers state
- Update ref whenever answers change
- Fix handleTimeUp to read from ref instead of stale closure
- Properly handle the async submission
```

Key code pattern:
```typescript
const answersRef = useRef(answers);
useEffect(() => { answersRef.current = answers; }, [answers]);

const handleTimeUp = useCallback(async () => {
  // Use answersRef.current for fresh state
}, [attemptId, questions, startTime]);
```

---

### Task 4: Practice vs Exam Time Up Behavior

**File**: `src/pages/MCQAttempt.tsx`

```text
Changes:
- Add state for showTimeUpDialog
- handleTimeUp checks test.test_mode:
  - 'exam' -> auto submit
  - 'practice' -> show dialog with "Continue" or "Submit" options
- Add new AlertDialog for time up choices
- "Continue" button closes dialog and pauses timer
- "Submit" button calls handleSubmit
```

---

### Task 5: Prevent Duplicate Points on Re-likes

**New Migration**: Add idempotency check to prevent duplicate point awards

```sql
-- Modify on_post_like_insert to check for existing point transaction
CREATE OR REPLACE FUNCTION public.on_post_like_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
  v_existing_transaction uuid;
BEGIN
  SELECT user_id INTO v_post_author_id FROM posts WHERE id = NEW.post_id;
  
  -- Check if points already awarded for this like
  SELECT id INTO v_existing_transaction 
  FROM point_transactions 
  WHERE reference_id = NEW.post_id 
    AND reference_type = 'post' 
    AND action = 'post_liked'
    AND user_id = v_post_author_id;
  
  IF v_post_author_id IS NOT NULL 
     AND v_post_author_id != NEW.user_id 
     AND v_existing_transaction IS NULL THEN
    PERFORM award_points(v_post_author_id, 'post_liked', 1, NEW.post_id, 'post');
  END IF;
  
  RETURN NEW;
END;
$$;
```

---

## Files to Create/Modify

| Action | File Path |
|--------|-----------|
| Modify | `supabase/functions/parse-mcq-pdf/index.ts` |
| Create | `src/components/qa/QandADisabledBanner.tsx` |
| Modify | `src/pages/QandA.tsx` |
| Modify | `src/pages/MCQAttempt.tsx` |
| Create | New SQL migration for points idempotency |

---

## Summary

This plan addresses all 5 issues:
1. PDF parsing will use Gemini's native PDF understanding (no external library)
2. Q&A will respect the admin toggle with a proper disabled banner
3. MCQ timer will correctly calculate scores using fresh state
4. Practice mode will give users a choice when time's up; Exam mode auto-submits
5. Points system will prevent duplicate awards from like/unlike cycles
