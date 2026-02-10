

# MCQ Dialog Fix & Mobile Polish Plan

## Issue 1: MCQ Details Dialog Cut Off on Mobile (CRITICAL)

The screenshot clearly shows the MCQ Detailed Analytics dialog has text clipped on the right side -- "3 atten" instead of "3 attempts", and the "Avg Time" column is hidden entirely.

**Root Cause:** The dialog uses `className="max-w-2xl max-h-[85vh] p-0"` which overrides the base dialog's mobile-friendly styling. The `max-w-2xl` (672px) exceeds mobile viewport (390px), and `p-0` removes padding while the ScrollArea adds `px-6` back, but the inner content (especially the table with 6 columns) overflows without being scrollable horizontally.

**Fix in `MCQDetailsDialog.tsx`:**
- Remove `max-w-2xl` and `p-0` from DialogContent -- let the base dialog handle mobile sizing (it already slides up from bottom on mobile and centers on desktop)
- The score distribution text should wrap or use smaller font on mobile
- The table already has `overflow-x-auto` but needs to be inside a container that properly constrains width
- Remove the `max-h-[85vh]` since the base dialog already handles this
- Adjust the ScrollArea to not fight with the dialog's own scrolling

**Specific changes:**
```
DialogContent className="" (remove max-w-2xl, max-h-[85vh], p-0)
  or use: className="sm:max-w-2xl"
DialogHeader: remove p-6 pb-3 (use default padding)
ScrollArea: remove px-6 pb-6, use default padding
```

## Issue 2: Score Distribution Text Truncated

The right-side text "3 atten..." is cut because on mobile the flex row doesn't have enough room.

**Fix:** Make the score distribution labels more compact on mobile:
- Use `text-xs` instead of `text-sm` for the count text
- Abbreviate: show just count and percentage without the word "attempt(s)"
- Or wrap text with `flex-wrap`

## Issue 3: Per-Test Table Too Wide for Mobile

6 columns (Test, Attempts, Users, Avg, Best, Avg Time) is too many for 390px.

**Fix:** Hide the "Avg Time" column on mobile using `hidden sm:table-cell` on both the TableHead and TableCell for that column. This reduces columns to 5 which fits better.

## Issue 4: General Mobile Polish (Minor Improvements)

After auditing all pages on mobile, the overall layout is solid. Minor improvements:

**Analytics page stat cards:** The swipe indicator works but scrollbar-hide class may not be effective without CSS. Add CSS rule `.scrollbar-hide::-webkit-scrollbar { display: none }` if not already present.

**Content Distribution card:** On mobile, the donut chart and legend stack vertically (`grid md:grid-cols-2`) which is correct. No issues found.

**Admin pages (Dashboard, Notes, MCQ, etc.):** All look good on mobile. No layout issues detected.

**User pages (Dashboard, Notes, MCQ, Posts, More):** All render correctly with proper bottom nav spacing and card layouts.

---

## Summary of File Changes

### 1. `src/components/admin/analytics/MCQDetailsDialog.tsx`
- Remove `max-w-2xl max-h-[85vh] p-0` from DialogContent, use `sm:max-w-2xl` instead
- Remove custom padding from DialogHeader and ScrollArea, let the dialog's built-in padding work
- Make score distribution text more compact (use `text-xs` on mobile)
- Hide "Avg Time" column on mobile (`hidden sm:table-cell`)
- Ensure the table's `overflow-x-auto` wrapper works correctly within the dialog's own scroll

### 2. `src/index.css` (if needed)
- Add `.scrollbar-hide` utility CSS if not already present for the swipeable stat cards

No other files need changes -- the rest of the admin panel and user pages look correct on mobile.

---

## Technical Details

The base `dialog.tsx` already handles mobile perfectly:
- Slides up from bottom on mobile with rounded top corners
- Centers on desktop with `sm:max-w-lg`
- Has `max-h-[85vh] overflow-y-auto`
- Has internal drag handle for mobile

The MCQ dialog just needs to stop fighting these defaults with its own overrides. Using `sm:max-w-2xl` will let it be full-width on mobile (matching the slide-up sheet pattern) and wider on desktop where there's room.

