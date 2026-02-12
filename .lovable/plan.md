

# Fix: Notes Page Slow Loading & Missing Notes

## Problems Identified

1. **No caching**: The Notes page uses raw `useEffect` + `useState`. Every time you navigate away and come back, ALL data is refetched from scratch -- subjects, note counts, and notes per subject. This causes the spinner every single time.

2. **No loading state for notes**: When you select a subject (e.g., Arabic), the notes are fetched but there is NO loading indicator during the fetch. The page shows "No notes in this subject yet" while the data is still loading, which looks like the notes are missing (as shown in your screenshot).

3. **Same issue on other pages**: Dashboard, Profile, and other pages that use raw `useEffect` also refetch on every visit.

---

## Changes

### File: `src/pages/Notes.tsx`
Complete conversion to React Query for instant page loads on revisit:

**Subjects fetching** -- Convert to `useQuery` with key `['subjects']`:
- Fetches subjects and note counts in one query function
- Cached for 2 minutes (global staleTime), so navigating back is instant
- Shows skeleton loading cards instead of a plain spinner

**Notes per subject** -- Convert to `useQuery` with key `['notes', selectedSubject?.id]`:
- Only fetches when a subject is selected (`enabled: !!selectedSubject`)
- Each subject's notes are cached separately, so switching between subjects you already visited is instant
- Shows skeleton note cards while loading instead of "No notes" message

**Loading states**:
- Subject grid: Show 6 skeleton cards (matching the grid layout) instead of spinner
- Notes list: Show 4 skeleton note cards when a subject is selected and notes are loading
- This eliminates both the "blank spinner" and the "No notes" false state

**Key behavioral change**: Going to Notes, selecting Arabic, going to Dashboard, coming back to Notes -- subjects grid loads instantly from cache. Selecting Arabic again -- notes load instantly from cache.

### Technical Details

```text
Before (current flow):
Navigate to /notes -> spinner -> fetch subjects -> fetch counts -> show grid
Select Arabic -> fetch notes (NO loading indicator) -> show "No notes" briefly -> show notes
Navigate away -> come back -> repeat ALL of the above

After (with React Query):
Navigate to /notes -> show cached subjects instantly (or skeleton on first load)
Select Arabic -> show cached notes instantly (or skeleton on first load)
Navigate away -> come back -> everything instant from cache
```

React Query keys:
- `['subjects']` -- subjects list + note counts
- `['subject-notes', subjectId]` -- notes for a specific subject

Both use the global 2-minute staleTime already configured in the QueryClient, so data refreshes in the background without blocking the UI.

Skeleton components will use the existing `Skeleton` component from `@/components/ui/skeleton`, matching the card dimensions for a seamless loading experience.

