

# Analytics Enhancement & Mobile Swipe Fix

## Issues Identified

### 1. Bar Charts Not Swipeable on Mobile
The "Top Downloaded Notes" and "Most Saved Notes" horizontal bar charts are inside a fixed-width `ChartContainer` with no horizontal scroll. On mobile, the chart labels get truncated to 18 characters and there's no way to see the full data by swiping. The Recharts `BarChart` needs to be wrapped in a horizontally scrollable container with a minimum width so the bars and labels aren't cramped.

### 2. MCQ Analytics Too Basic
The current MCQ Performance card only shows:
- Published Tests count
- Total Attempts count
- Average Score (progress bar)
- Completion Rate (progress bar)

Missing details: per-test breakdown (which test has most attempts, best/worst scores), per-user performance (top performers, struggling students), score distribution, and time analytics.

### 3. No "View Details" Dialog
There's no way to tap on a card/stat for more information. The user wants clickable icons or text that open a dialog with deeper analytics.

---

## Changes

### File 1: `src/components/admin/analytics/TopNotesCharts.tsx`
**Fix: Make bar charts horizontally scrollable on mobile**

- Wrap each `ChartContainer` in a `div` with `overflow-x-auto` and a `min-width` on the inner chart container (e.g., `min-w-[400px]`) so on narrow screens the chart is scrollable
- Add a subtle swipe indicator text "Swipe to see more" visible only on mobile (`md:hidden`)

### File 2: `src/components/admin/analytics/CommunityMCQCards.tsx`
**Enhancement: Add detailed MCQ analytics with dialog**

- Add a clickable "View Details" button/icon (Info icon) on the MCQ Performance card header
- When clicked, open a `Dialog` showing:
  - **Per-Test Breakdown Table**: Test name, attempts count, unique users, avg score, highest/lowest score, avg time
  - **Top Performers List**: User name, total attempts, avg score, best score
  - **Score Distribution**: How many scored 0-40%, 40-60%, 60-80%, 80-100%
- Fetch this detailed data from Supabase in the dialog (lazy load on open)
- Add similar "View Details" on the Community Overview card for Q&A/Posts breakdown

### File 3: `src/hooks/useAnalyticsData.tsx`
**Enhancement: Add detailed MCQ data fetching**

- Add new state and fetch functions for:
  - `mcqTestDetails`: per-test stats (test title, attempts, unique users, avg score, highest/lowest, avg time)
  - `mcqUserStats`: per-user stats (name, attempts, completed, avg score, best score)
  - `mcqScoreDistribution`: count of scores in ranges (0-40, 40-60, 60-80, 80-100)
- Add new interfaces: `MCQTestDetail`, `MCQUserStat`
- These will be fetched alongside existing data

### File 4: `src/components/admin/analytics/AnalyticsStatCards.tsx`
**Fix: Make stat cards horizontally scrollable on mobile**

- Change the grid on mobile from `grid-cols-2` to a horizontal scroll container using `flex overflow-x-auto gap-4 pb-2 md:grid md:grid-cols-4` with `snap-x snap-mandatory` for smooth card snapping
- Each card gets `min-w-[160px] snap-center flex-shrink-0 md:min-w-0`
- This makes the 4 stat cards swipeable on mobile instead of stacking in 2x2

---

## Technical Details

### New Data Queries (in useAnalyticsData)

Per-test MCQ stats:
```sql
SELECT t.title, COUNT(a.id) as attempts, COUNT(DISTINCT a.user_id) as users,
  AVG(score) as avg_score, MAX(score) as high, MIN(score) as low, AVG(time_taken_secs) as avg_time
FROM mcq_tests t LEFT JOIN mcq_attempts a ON a.test_id = t.id
WHERE t.is_published = true GROUP BY t.id
```

Per-user MCQ stats:
```sql
SELECT p.full_name, COUNT(a.id) as attempts, AVG(score) as avg_score, MAX(score) as best
FROM mcq_attempts a JOIN profiles p ON p.id = a.user_id
GROUP BY a.user_id, p.full_name
```

Score distribution:
```sql
SELECT score ranges from mcq_attempts WHERE status = 'completed'
```

### New Components Used
- `Dialog` / `DialogContent` (existing shadcn component) for detail views
- `Table` / `TableRow` (existing) for per-test breakdown
- `ScrollArea` (existing) for scrollable dialog content
- `Info` icon from lucide-react as the "details" trigger

### Mobile Swipe Pattern
```text
On mobile:
[Card 1] [Card 2] [Card 3] [Card 4] -->
  snap-x scrollable with momentum

On desktop:
[Card 1] [Card 2] [Card 3] [Card 4]
  standard 4-column grid
```

### MCQ Details Dialog Layout
```text
+------------------------------------------+
|  MCQ Detailed Analytics            [X]   |
+------------------------------------------+
|                                          |
|  Score Distribution                      |
|  [====] 80-100%: 3 attempts (37.5%)     |
|  [===]  60-80%:  2 attempts (25%)       |
|  [==]   40-60%:  1 attempt  (12.5%)     |
|  [=]    0-40%:   2 attempts (25%)       |
|                                          |
|  Per-Test Breakdown                      |
|  +------+--------+------+------+------+ |
|  | Test | Attemp | Users| Avg  | Best | |
|  +------+--------+------+------+------+ |
|  | Prog | 4      | 1    | 65%  | 80%  | |
|  | Test | 3      | 1    | 30%  | 40%  | |
|  +------+--------+------+------+------+ |
|                                          |
|  Top Performers                          |
|  1. Zain Nawab - Avg: 50% Best: 80%    |
|                                          |
+------------------------------------------+
```

### Files Modified Summary
1. `src/hooks/useAnalyticsData.tsx` - Add MCQ detail data types and queries
2. `src/components/admin/analytics/AnalyticsStatCards.tsx` - Mobile horizontal scroll
3. `src/components/admin/analytics/TopNotesCharts.tsx` - Scrollable bar charts
4. `src/components/admin/analytics/CommunityMCQCards.tsx` - Add detail dialogs with per-test, per-user, and score distribution data

