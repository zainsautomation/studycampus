

# Fix Missing MCQ in Desktop Nav + Optimize Page Loading

## Problem 1: MCQ Missing from Desktop Header

The desktop header shows the first 5 items from `navItems` array (`slice(0, 5)`): Dashboard, Notes, Saved, Announcements, Updates. MCQ is not in the array at all -- it only exists in the mobile BottomNav.

**Fix:** Add MCQ to `navItems` in `Header.tsx` and reorder so the 5 visible items are the most important ones. Move secondary items to "More" dropdown.

New visible items: **Dashboard, Notes, MCQ Tests, Posts, Announcements**
Moved to "More": Saved, Updates, Q&A, Requests, Leaderboard

### File: `src/components/layout/Header.tsx`
- Import `FileQuestion` icon from lucide-react
- Add MCQ to `navItems` array and reorder priority
- Adjust `slice(0, 5)` items to show the right 5

---

## Problem 2: Pages Load Too Slowly (All-at-once fetching)

Currently, **Posts, Q&A, Requests, and Announcements** all fetch every record at once with `useQuery`. For growing datasets this gets slower over time.

**Fix:** Convert these pages to use `useInfiniteQuery` with scroll-based pagination (infinite scroll), loading ~10-15 items at a time. As the user scrolls to the bottom, more items load automatically.

### Pages to convert to infinite scroll:

| Page | Current | Change |
|------|---------|--------|
| **Posts** (`Posts.tsx`) | Fetches all posts | `useInfiniteQuery` + `.range()` + scroll sentinel |
| **Q&A** (`QandA.tsx`) | Fetches all questions | `useInfiniteQuery` + `.range()` + scroll sentinel |
| **Requests** (`Requests.tsx`) | Fetches all requests | `useInfiniteQuery` + `.range()` + scroll sentinel |
| **Announcements** (`Announcements.tsx`) | Fetches all announcements | `useInfiniteQuery` + `.range()` + scroll sentinel |

### Technical approach (same pattern for all 4 pages):

1. Replace `useQuery` with `useInfiniteQuery`
2. Use Supabase `.range(offset, offset + PAGE_SIZE - 1)` for pagination
3. Add an `IntersectionObserver` on a sentinel `<div>` after the last item
4. When sentinel is visible, call `fetchNextPage()`
5. Flatten data with `data.pages.flatMap(p => p)` for rendering
6. Show a small spinner at the bottom while loading more
7. Page size: 10 items per batch

### Also: Eagerly import Announcements

Since Announcements is in the top 5 nav items, it should be eagerly imported in `App.tsx` (like Dashboard, Notes, Posts, MCQ) to avoid the lazy-load spinner.

---

## Files to modify

1. `src/components/layout/Header.tsx` -- Add MCQ, reorder nav items
2. `src/App.tsx` -- Eagerly import Announcements
3. `src/pages/Posts.tsx` -- Infinite scroll
4. `src/pages/QandA.tsx` -- Infinite scroll
5. `src/pages/Requests.tsx` -- Infinite scroll
6. `src/pages/Announcements.tsx` -- Infinite scroll

