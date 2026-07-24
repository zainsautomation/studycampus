## Plan: Fix What's New disappearing too quickly

### Goal
Make the What's New list stay visible while the user is reading it. New content should only disappear after the user closes/leaves the What's New popover or clicks a listed item.

### Current confirmed behavior
In `src/components/whats-new/WhatsNewButton.tsx`, opening the popover starts an 800ms timer that calls `markAsRead()`. Because `useWhatsNew.tsx` refetches using the updated `whats_new_checked_at`, the list becomes empty while the popover is still open.

### Changes to make
1. **Remove the auto-clear timer on open**
   - Delete the `setTimeout(() => markAsRead(), 800)` behavior.
   - Opening the popover will no longer mark anything as read.

2. **Mark as read when the popover closes**
   - Track whether the popover had unread items while open.
   - When `onOpenChange(false)` runs because the user clicks elsewhere, presses Escape, or leaves/closes the popover, call `markAsRead()`.
   - The badge will clear after closing, not during reading.

3. **Mark as read when clicking a What's New item**
   - If the user clicks a note/MCQ/announcement/update from the list, call `markAsRead()` before closing/navigating.
   - This matches the expectation that leaving What's New clears it.

4. **Keep manual “Mark all as read” behavior**
   - The existing button will still immediately mark items read and close the popover.

5. **Add a small safety guard**
   - Avoid repeated `markAsRead()` calls if there are no unread items or if the popover closes after already being manually marked.

### Files to update
- `src/components/whats-new/WhatsNewButton.tsx`

### Validation
- Open What's New with unread content: list remains visible while open.
- Click outside / close popover: unread badge clears afterward.
- Reopen after closing: empty/caught-up state appears.
- Click a listed item: popover closes and unread state is cleared.