

# Full Website Optimization & Performance Plan

## Audit Summary

After reviewing all source code, logging in, and taking screenshots across every page on mobile (390x844), here is the complete findings and improvement plan.

---

## Category 1: Performance & Speed Optimizations

### 1.1 Google Fonts Blocking Render (HIGH IMPACT)
**File: `src/index.css` (line 5)**

The Google Fonts import `@import url('https://fonts.googleapis.com/css2?family=Inter:...')` is a render-blocking CSS import. This delays the First Contentful Paint significantly.

**Fix:** Move the font loading to `index.html` using `<link rel="preconnect">` and `<link rel="stylesheet">` with `display=swap` already set. This allows the browser to start fetching fonts earlier while rendering with fallback fonts.

### 1.2 Dashboard Makes 3 Sequential Supabase Calls (MEDIUM IMPACT)
**File: `src/pages/Dashboard.tsx` (lines 76-109)**

The Dashboard `useEffect` fetches announcements, notes, and updates sequentially using `await` one after another. Each call waits for the previous to finish.

**Fix:** Use `Promise.all()` to fetch all three in parallel, reducing total load time by ~60%.

```
Before: fetch A (200ms) -> fetch B (200ms) -> fetch C (200ms) = ~600ms
After:  Promise.all([A, B, C]) = ~200ms
```

### 1.3 Notes Page Fetches ALL Notes on Load (MEDIUM IMPACT)
**File: `src/pages/Notes.tsx` (lines 108-111)**

The Notes page fetches ALL notes from the database on initial load (`select('*')` with no filter), even though the user hasn't selected a subject yet. Notes are only displayed after selecting a subject.

**Fix:** Fetch subjects first, then only fetch notes when a subject is selected (lazy loading). This reduces the initial payload significantly.

### 1.4 Profile Page Makes 5 Sequential Database Calls (MEDIUM IMPACT)
**File: `src/pages/Profile.tsx` (lines 51-96)**

Profile fetches the profile first, then runs 4 parallel count queries. But `useUserPoints` hook also runs 3 more queries (points, achievements, user_achievements). Total: ~8 database calls.

**Fix:** The `Promise.all` for stats is already good. Consider combining the `useUserPoints` data into the same fetch or using React Query for caching.

### 1.5 Leaderboard Fetches All Data with useEffect Instead of React Query (LOW IMPACT)
**File: `src/pages/Leaderboard.tsx` (lines 50-87)**

Uses raw `useEffect` + `useState` pattern instead of React Query, meaning no caching, no deduplication, and refetches every time the component mounts.

**Fix:** Convert to `useQuery` to benefit from the 2-minute staleTime already configured.

### 1.6 Announcements & Updates Pages Use Raw useEffect (LOW IMPACT)
**Files: `src/pages/Announcements.tsx`, `src/pages/Updates.tsx`**

Both pages use raw `useEffect` for data fetching without loading states or caching.

**Fix:** Convert to `useQuery` for consistency, caching, and proper loading/error states.

### 1.7 GoogleDriveContext Loads for All Users (LOW IMPACT)
**File: `src/contexts/GoogleDriveContext.tsx` (lines 131-192)**

The Google Drive API script loads for all users on app startup, even though only admins need it. This adds external script loading overhead.

**Fix:** Already handled with conditional initialization checking for clientId/apiKey. But the GAPI script still loads if those env vars exist. Consider deferring until admin actually navigates to notes management.

---

## Category 2: Code Quality & Bug Fixes

### 2.1 GlobalSearch Runs 5 Parallel Queries Without AbortController (MEDIUM)
**File: `src/components/search/GlobalSearch.tsx` (lines 73-179)**

When typing rapidly, old search queries aren't cancelled. Each keystroke (after debounce) fires 5 Supabase queries that may return out-of-order.

**Fix:** Add an AbortController or query ID check to discard stale results.

### 2.2 Dashboard Quick Stats Show Limited Counts (LOW)
**File: `src/pages/Dashboard.tsx` (lines 180-225)**

The "Announcements" stat card shows `announcements.length` which is always max 3 (due to `.limit(3)`), not the actual total count. Same for notes (max 4).

**Fix:** Use `{ count: 'exact', head: true }` for total counts alongside the limited data fetch.

### 2.3 Notes Download Count Update Has No Optimistic UI (LOW)
**File: `src/pages/Notes.tsx` (lines 162-213)**

Download count is updated via raw Supabase call without refreshing the UI or using optimistic updates.

**Fix:** Update the local state optimistically when download starts.

---

## Category 3: Mobile UX Improvements

### 3.1 Leaderboard Header Wrapping Issues on Mobile
**File: `src/pages/Leaderboard.tsx` (lines 107-123)**

The header has "Leaderboard" title and "All Time / This Week" tabs side by side. On narrow screens, the tabs can overflow.

**Fix:** Stack the title and tabs vertically on mobile using `flex-col sm:flex-row`.

### 3.2 Q&A Page "Ask Question" Button Wrapping
**File: `src/pages/QandA.tsx` (lines 123-141)**

On very narrow screens, the header with title + "Ask Question" button can wrap awkwardly.

**Fix:** Already using `flex-wrap`, but the button could be full-width on mobile for better UX.

### 3.3 Announcements Page Missing Loading State
**File: `src/pages/Announcements.tsx`**

No loading skeleton - content just appears suddenly after fetch completes.

**Fix:** Add loading skeleton similar to other pages.

### 3.4 Updates Page Missing Loading State
**File: `src/pages/Updates.tsx`**

Same issue - no loading indicator while data is being fetched.

**Fix:** Add loading skeleton.

---

## Category 4: Design Polish

### 4.1 Dashboard "Quick Stats" Cards Show Misleading Numbers
The stat cards show `announcements.length` (max 3) and `notes.length` (max 4) instead of true totals. The "Date" card is not particularly useful as a stat.

**Fix:** Replace the date card with a more useful stat like "Total Questions" or "Your Points", and show true totals.

### 4.2 More Page Lacks Visual Polish
**File: `src/pages/More.tsx`**

The More page is functional but plain compared to the rest of the app. No gradient header, no icon background.

**Fix:** Add a gradient header icon consistent with Posts, Q&A, and other pages.

---

## Implementation Priority

### Phase 1 - Performance (Highest Impact)
1. Move Google Fonts to `index.html` with preconnect (1 file)
2. Parallelize Dashboard data fetching with `Promise.all` (1 file)
3. Lazy-load Notes data - only fetch when subject selected (1 file)
4. Convert Leaderboard to React Query (1 file)
5. Convert Announcements to React Query with loading state (1 file)
6. Convert Updates to React Query with loading state (1 file)

### Phase 2 - Bug Fixes & Code Quality
7. Fix Dashboard stats to show true total counts (1 file)
8. Add AbortController to GlobalSearch (1 file)

### Phase 3 - Mobile UX Polish
9. Fix Leaderboard header stacking on mobile (1 file)
10. Add More page gradient header (1 file)

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add `<link rel="preconnect">` for Google Fonts, add `<link>` for stylesheet |
| `src/index.css` | Remove `@import url(...)` for Google Fonts |
| `src/pages/Dashboard.tsx` | Use `Promise.all()` for parallel fetches, fix stat card counts |
| `src/pages/Notes.tsx` | Lazy-load notes per subject instead of all at once |
| `src/pages/Leaderboard.tsx` | Convert to `useQuery`, fix mobile header layout |
| `src/pages/Announcements.tsx` | Convert to `useQuery` with loading skeleton |
| `src/pages/Updates.tsx` | Convert to `useQuery` with loading skeleton |
| `src/components/search/GlobalSearch.tsx` | Add stale result prevention |
| `src/pages/More.tsx` | Add gradient header icon |

### No New Dependencies Required
All changes use existing React Query, Tailwind, and component library already installed.

