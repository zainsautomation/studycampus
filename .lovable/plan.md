# Plan: MCQ Student Results Explorer + Terms & Conditions Page

## Part 1: MCQ Student Results in Analytics

### What exists today

The Analytics page has an MCQ Performance card with an "Info" dialog showing aggregated stats (score distribution, per-test breakdown, top performers). However, there is no way to drill into **individual student results per test** -- e.g., "Which students attempted Test X, what did they score, when did they attempt it?"

### What we will build

**A new "MCQ Results" admin page** (`/admin/mcq-results`) accessible from the admin sidebar, providing a full student-by-test results explorer.

#### UI Flow (Mobile-first)

1. **Filter Bar** (sticky top):
  - Test selector dropdown (all published tests)
  - Student search input (by name)
  - Status filter chips: All / Completed / In Progress
2. **Results List** (card-based on mobile, table on desktop):
  - Each row/card shows: Student avatar + name, Test title, Score (color-coded), Status badge, Time taken, Date attempted
  - Tap a row to expand inline details: per-question responses (correct/incorrect), time breakdown
  - Sort by: Score (asc/desc), Date, Student name
3. **Summary Header**:
  - Total attempts shown, average score, completion rate for current filter
4. **Export** (stretch): CSV download button for filtered results

#### Data Source

All data already exists in `mcq_attempts`, `mcq_responses`, `mcq_tests`, `mcq_questions`, `mcq_options`, and `profiles`. Admin RLS policies already grant full SELECT access. No database changes needed.

#### Files to create/modify


| File                                                      | Action                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/pages/admin/MCQResults.tsx`                          | **Create** - Main page with filters, summary, results list                      |
| `src/components/admin/mcq-results/ResultsFilterBar.tsx`   | **Create** - Test selector, search, status filters                              |
| `src/components/admin/mcq-results/ResultCard.tsx`         | **Create** - Mobile card / desktop table row for each attempt                   |
| `src/components/admin/mcq-results/AttemptDetailSheet.tsx` | **Create** - Expandable detail view showing per-question responses              |
| `src/components/admin/mcq-results/ResultsSummary.tsx`     | **Create** - Summary stats for current filter                                   |
| `src/hooks/useMCQResults.tsx`                             | **Create** - Data fetching hook with filters, joins attempts + profiles + tests |
| `src/components/admin/AdminSidebar.tsx`                   | **Modify** - Add "MCQ Results" nav link under existing MCQ entry                |
| `src/App.tsx`                                             | **Modify** - Add `/admin/mcq-results` route                                     |


---

## Part 2: Terms & Conditions Page

### What we will build

A professional, modern Terms & Conditions page at `/terms` accessible to all users (no auth required).

#### Content Sections

1. Acceptance of Terms
2. User Accounts & Eligibility
3. Acceptable Use Policy
4. Intellectual Property (notes, MCQs, posts)
5. User-Generated Content
6. Privacy & Data Collection
7. Limitation of Liability
8. Termination
9. Changes to Terms
10. Contact Information
11. While sign up show user by create account you agrees term and conditions

#### UI Design (Mobile-first)

- Clean, readable layout with a sticky table of contents sidebar on desktop, collapsible accordion on mobile
- Section headings with anchor links for easy navigation
- "Last updated" date at the top
- Subtle card-based sections with proper typography hierarchy
- Back-to-top floating button on mobile

#### Files to create/modify


| File                                                | Action                                                          |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `src/pages/Terms.tsx`                               | **Create** - Full Terms & Conditions page                       |
| `src/App.tsx`                                       | **Modify** - Add `/terms` public route                          |
| `src/components/layout/BottomNav.tsx` or `More.tsx` | **Modify** - Add link to Terms page from the More/Settings area |


---

## Technical Notes

- No database migrations required -- all MCQ data is already available via existing tables and admin RLS policies
- The MCQ Results page fetches from `mcq_attempts` joined with `profiles` and `mcq_tests`, with client-side filtering for responsiveness
- Terms page is purely static content, no backend dependency
- All components use existing UI primitives (Card, Badge, Avatar, Select, Sheet, Accordion, ScrollArea)
- Mobile-first: card layouts, bottom sheets for details, horizontal scroll where needed; desktop gets table views and sidebar navigation